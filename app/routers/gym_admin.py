from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import get_current_gym_staff, get_current_gym_owner, hash_password
from app.core.feature_flags import get_plan_features, check_feature, FEATURE_LABELS, UPGRADE_PLAN
from app.models import (
    Member, GymStaff, MembershipPlan, Payment, WorkoutPlan,
    WorkoutDay, DietPlan, MemberPlanAssignment, AttendanceLog, Gym, GymSubscription,
    BodyMeasurement
)
from app.schemas.gym_admin_schemas import (
    MemberCreate, MemberUpdate, MemberResponse,
    StaffCreate, StaffUpdate, StaffResponse,
    MembershipPlanCreate, MembershipPlanUpdate, MembershipPlanResponse,
    PaymentCreate, PaymentUpdate, PaymentResponse,
    WorkoutPlanCreate, WorkoutPlanUpdate, WorkoutPlanResponse,
    DietPlanCreate, DietPlanUpdate, DietPlanResponse,
    PlanAssignmentCreate,
    GymSettingsResponse, GymSettingsUpdate,
    BodyMeasurementCreate, BodyMeasurementUpdate, BodyMeasurementResponse,
)
from app.services.receipt_service import generate_receipt_pdf
import random
import string

router = APIRouter(prefix="/gym", tags=["Gym Admin"])


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def gen_receipt_number() -> str:
    chars = string.ascii_uppercase + string.digits
    return "REC-" + "".join(random.choices(chars, k=8))


def require_gym(gym_id: str, staff: GymStaff):
    if staff.gym_id != gym_id:
        raise HTTPException(status_code=403, detail="Access denied to this gym")


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@router.get("/dashboard")
def gym_dashboard(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    gym_id = staff.gym_id
    today = date.today()

    total_members = db.query(func.count(Member.id)).filter(
        Member.gym_id == gym_id, Member.is_active == True
    ).scalar() or 0

    expired_members = db.query(func.count(Member.id)).filter(
        Member.gym_id == gym_id,
        Member.is_active == True,
        Member.plan_expiry < today
    ).scalar() or 0

    expiring_soon = db.query(func.count(Member.id)).filter(
        Member.gym_id == gym_id,
        Member.is_active == True,
        Member.plan_expiry >= today,
        Member.plan_expiry <= date.fromordinal(today.toordinal() + 7)
    ).scalar() or 0

    today_attendance = db.query(func.count(AttendanceLog.id)).filter(
        AttendanceLog.gym_id == gym_id,
        func.date(AttendanceLog.checked_in_at) == today
    ).scalar() or 0

    monthly_revenue = db.query(func.sum(Payment.amount)).filter(
        Payment.gym_id == gym_id,
        func.extract('month', Payment.payment_date) == today.month,
        func.extract('year', Payment.payment_date) == today.year
    ).scalar() or 0

    return {
        "total_active_members": total_members,
        "expired_memberships": expired_members,
        "expiring_in_7_days": expiring_soon,
        "today_attendance": today_attendance,
        "monthly_revenue": float(monthly_revenue),
    }


# ─────────────────────────────────────────────
# FEATURE FLAGS (plan-based access control)
# ─────────────────────────────────────────────

@router.get("/features")
def get_gym_features(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    """Returns the feature matrix for the gym's current subscription plan."""
    sub = db.query(GymSubscription).filter(
        GymSubscription.gym_id == staff.gym_id
    ).first()
    plan_name = sub.plan.value if sub else "basic"

    features = get_plan_features(plan_name)
    return {
        "plan": plan_name,
        "features": features,
        "labels": FEATURE_LABELS,
        "upgrade_map": UPGRADE_PLAN,
    }


# ─────────────────────────────────────────────
# GYM SETTINGS (self-service for gym owner)
# ─────────────────────────────────────────────

@router.get("/settings")
def get_gym_settings(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    gym = db.query(Gym).filter(Gym.id == staff.gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    sub = db.query(GymSubscription).filter(GymSubscription.gym_id == gym.id).first()
    return {
        "id": gym.id,
        "name": gym.name,
        "owner_name": gym.owner_name,
        "phone": gym.phone,
        "email": gym.email or None,
        "address": gym.address or None,
        "city": gym.city or None,
        "logo_url": gym.logo_url or None,
        "qr_token": gym.qr_token or None,
        "subscription_plan": sub.plan.value if sub else None,
        "subscription_expiry": str(sub.expiry_date) if sub and sub.expiry_date else None,
        "is_active": gym.is_active,
    }


@router.put("/settings")
def update_gym_settings(
    payload: GymSettingsUpdate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    gym = db.query(Gym).filter(Gym.id == owner.gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gym, field, value)
    db.commit()
    db.refresh(gym)
    sub = db.query(GymSubscription).filter(GymSubscription.gym_id == gym.id).first()
    return {
        "id": gym.id,
        "name": gym.name,
        "owner_name": gym.owner_name,
        "phone": gym.phone,
        "email": gym.email or None,
        "address": gym.address or None,
        "city": gym.city or None,
        "logo_url": gym.logo_url or None,
        "qr_token": gym.qr_token or None,
        "subscription_plan": sub.plan.value if sub else None,
        "subscription_expiry": str(sub.expiry_date) if sub and sub.expiry_date else None,
        "is_active": gym.is_active,
    }


# ─────────────────────────────────────────────
# MEMBERS
# ─────────────────────────────────────────────

@router.post("/members", response_model=MemberResponse, status_code=201)
def add_member(
    payload: MemberCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    existing = db.query(Member).filter(
        Member.phone == payload.phone,
        Member.gym_id == staff.gym_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member with this phone already exists in your gym")

    member = Member(
        gym_id=staff.gym_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        dob=payload.dob,
        gender=payload.gender,
        address=payload.address,
        emergency_contact=payload.emergency_contact,
        profile_photo_url=payload.profile_photo_url,
        join_date=payload.join_date or date.today(),
        plan_expiry=payload.plan_expiry,
        is_active=True,
        created_by=staff.id,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("/members", response_model=List[MemberResponse])
def list_members(
    is_active: Optional[bool] = True,
    search: Optional[str] = Query(None),
    expiring_in_days: Optional[int] = Query(None, description="Filter members expiring within N days"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    query = db.query(Member).filter(Member.gym_id == staff.gym_id)

    if is_active is not None:
        query = query.filter(Member.is_active == is_active)

    if search:
        query = query.filter(
            Member.name.ilike(f"%{search}%") |
            Member.phone.ilike(f"%{search}%")
        )

    if expiring_in_days is not None:
        today = date.today()
        deadline = date.fromordinal(today.toordinal() + expiring_in_days)
        query = query.filter(
            Member.plan_expiry >= today,
            Member.plan_expiry <= deadline
        )

    return query.offset(skip).limit(limit).all()


@router.get("/members/{member_id}", response_model=MemberResponse)
def get_member(
    member_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return member


@router.put("/members/{member_id}", response_model=MemberResponse)
def update_member(
    member_id: str,
    payload: MemberUpdate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(member, field, value)

    db.commit()
    db.refresh(member)
    return member


@router.delete("/members/{member_id}")
def deactivate_member(
    member_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    member.is_active = False
    db.commit()
    return {"message": "Member deactivated"}


# ─────────────────────────────────────────────
# STAFF MANAGEMENT (owner only)
# ─────────────────────────────────────────────

@router.post("/staff", response_model=StaffResponse, status_code=201)
def add_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    existing = db.query(GymStaff).filter(
        GymStaff.phone == payload.phone,
        GymStaff.gym_id == owner.gym_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Staff with this phone already exists")

    staff = GymStaff(
        gym_id=owner.gym_id,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return staff


@router.get("/staff", response_model=List[StaffResponse])
def list_staff(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    return db.query(GymStaff).filter(
        GymStaff.gym_id == staff.gym_id,
        GymStaff.is_active == True
    ).all()


@router.put("/staff/{staff_id}", response_model=StaffResponse)
def update_staff(
    staff_id: str,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    target = db.query(GymStaff).filter(
        GymStaff.id == staff_id,
        GymStaff.gym_id == owner.gym_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Staff not found")
    if target.role.value == "owner" and target.id != owner.id:
        raise HTTPException(status_code=400, detail="Cannot edit another owner")

    data = payload.model_dump(exclude_unset=True)
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    else:
        data.pop("password", None)

    for field, value in data.items():
        setattr(target, field, value)

    db.commit()
    db.refresh(target)
    return target


@router.delete("/staff/{staff_id}")
def remove_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    member = db.query(GymStaff).filter(
        GymStaff.id == staff_id,
        GymStaff.gym_id == owner.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Staff not found")
    if member.role == "owner":
        raise HTTPException(status_code=400, detail="Cannot remove gym owner")

    member.is_active = False
    db.commit()
    return {"message": "Staff removed"}


# ─────────────────────────────────────────────
# MEMBERSHIP PLANS
# ─────────────────────────────────────────────

@router.post("/membership-plans", response_model=MembershipPlanResponse, status_code=201)
def create_membership_plan(
    payload: MembershipPlanCreate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    plan = MembershipPlan(
        gym_id=owner.gym_id,
        name=payload.name,
        duration_days=payload.duration_days,
        price=payload.price,
        description=payload.description,
        is_active=True,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/membership-plans", response_model=List[MembershipPlanResponse])
def list_membership_plans(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    return db.query(MembershipPlan).filter(
        MembershipPlan.gym_id == staff.gym_id,
        MembershipPlan.is_active == True
    ).all()


@router.put("/membership-plans/{plan_id}", response_model=MembershipPlanResponse)
def update_membership_plan(
    plan_id: str,
    payload: MembershipPlanUpdate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == plan_id,
        MembershipPlan.gym_id == owner.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/membership-plans/{plan_id}")
def deactivate_membership_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    plan = db.query(MembershipPlan).filter(
        MembershipPlan.id == plan_id,
        MembershipPlan.gym_id == owner.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    plan.is_active = False
    db.commit()
    return {"message": "Plan deactivated"}


# ─────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────

@router.post("/payments", response_model=PaymentResponse, status_code=201)
def record_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id,
        Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    payment = Payment(
        gym_id=staff.gym_id,
        member_id=payload.member_id,
        membership_plan_id=payload.membership_plan_id,
        amount=payload.amount,
        payment_date=payload.payment_date,
        mode=payload.mode,
        receipt_number=gen_receipt_number(),
        notes=payload.notes,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        recorded_by=staff.id,
    )
    db.add(payment)

    # Update member plan_expiry if valid_to provided
    if payload.valid_to:
        member.plan_expiry = payload.valid_to

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/payments", response_model=List[PaymentResponse])
def list_payments(
    member_id: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    query = db.query(Payment).filter(Payment.gym_id == staff.gym_id)

    if member_id:
        query = query.filter(Payment.member_id == member_id)
    if from_date:
        query = query.filter(Payment.payment_date >= from_date)
    if to_date:
        query = query.filter(Payment.payment_date <= to_date)

    return query.order_by(Payment.created_at.desc()).offset(skip).limit(limit).all()


@router.put("/payments/{payment_id}", response_model=PaymentResponse)
def update_payment(
    payment_id: str,
    payload: PaymentUpdate,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.gym_id == owner.gym_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(payment, field, value)

    # Update member plan_expiry if valid_to changed
    if payload.valid_to and payment.member_id:
        member = db.query(Member).filter(Member.id == payment.member_id).first()
        if member:
            member.plan_expiry = payload.valid_to

    db.commit()
    db.refresh(payment)
    return payment


@router.delete("/payments/{payment_id}")
def void_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    owner: GymStaff = Depends(get_current_gym_owner)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.gym_id == owner.gym_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()
    return {"message": "Payment voided/deleted"}


@router.get("/payments/{payment_id}/receipt")
def download_receipt(
    payment_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.gym_id == staff.gym_id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    member = db.query(Member).filter(Member.id == payment.member_id).first()
    pdf_bytes = generate_receipt_pdf(payment, member, staff.gym_id, db)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt-{payment.receipt_number}.pdf"}
    )


# ─────────────────────────────────────────────
# WORKOUT PLANS
# ─────────────────────────────────────────────

@router.post("/workout-plans", response_model=WorkoutPlanResponse, status_code=201)
def create_workout_plan(
    payload: WorkoutPlanCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = WorkoutPlan(
        gym_id=staff.gym_id,
        name=payload.name,
        description=payload.description,
        created_by=staff.id,
        is_active=True,
    )
    db.add(plan)
    db.flush()

    for day_data in payload.days:
        day = WorkoutDay(
            plan_id=plan.id,
            day_name=day_data.day_name,
            day_number=day_data.day_number,
            exercises=[e.model_dump() for e in day_data.exercises],
        )
        db.add(day)

    db.commit()
    db.refresh(plan)
    return plan


@router.get("/workout-plans", response_model=List[WorkoutPlanResponse])
def list_workout_plans(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    return db.query(WorkoutPlan).filter(
        WorkoutPlan.gym_id == staff.gym_id,
        WorkoutPlan.is_active == True
    ).all()


@router.put("/workout-plans/{plan_id}", response_model=WorkoutPlanResponse)
def update_workout_plan(
    plan_id: str,
    payload: WorkoutPlanUpdate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.gym_id == staff.gym_id,
        WorkoutPlan.is_active == True
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    if payload.name is not None:
        plan.name = payload.name
    if payload.description is not None:
        plan.description = payload.description

    if payload.days is not None:
        # Delete existing days and recreate
        db.query(WorkoutDay).filter(WorkoutDay.plan_id == plan.id).delete()
        for day_data in payload.days:
            day = WorkoutDay(
                plan_id=plan.id,
                day_name=day_data.day_name,
                day_number=day_data.day_number,
                exercises=[e.model_dump() for e in day_data.exercises],
            )
            db.add(day)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/workout-plans/{plan_id}")
def deactivate_workout_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == plan_id,
        WorkoutPlan.gym_id == staff.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Workout plan not found")

    plan.is_active = False
    db.commit()
    return {"message": "Workout plan deactivated"}


@router.post("/workout-plans/assign")
def assign_workout_plan(
    payload: PlanAssignmentCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    assignment = db.query(MemberPlanAssignment).filter(
        MemberPlanAssignment.member_id == payload.member_id
    ).first()

    if assignment:
        assignment.workout_plan_id = payload.workout_plan_id
        assignment.assigned_by = staff.id
    else:
        assignment = MemberPlanAssignment(
            gym_id=staff.gym_id,
            member_id=payload.member_id,
            workout_plan_id=payload.workout_plan_id,
            assigned_by=staff.id,
        )
        db.add(assignment)

    db.commit()
    return {"message": "Workout plan assigned successfully"}


# ─────────────────────────────────────────────
# DIET PLANS
# ─────────────────────────────────────────────

@router.post("/diet-plans", response_model=DietPlanResponse, status_code=201)
def create_diet_plan(
    payload: DietPlanCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    plan = DietPlan(
        gym_id=staff.gym_id,
        member_id=payload.member_id,
        title=payload.title,
        meals=payload.meals,
        calories_target=payload.calories_target,
        protein_target=payload.protein_target,
        notes=payload.notes,
        valid_from=payload.valid_from,
        valid_to=payload.valid_to,
        assigned_by=staff.id,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.get("/diet-plans/{member_id}", response_model=List[DietPlanResponse])
def get_member_diet_plans(
    member_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    return db.query(DietPlan).filter(
        DietPlan.member_id == member_id,
        DietPlan.gym_id == staff.gym_id
    ).order_by(DietPlan.created_at.desc()).all()


@router.put("/diet-plans/{plan_id}", response_model=DietPlanResponse)
def update_diet_plan(
    plan_id: str,
    payload: DietPlanUpdate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id,
        DietPlan.gym_id == staff.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(plan, field, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/diet-plans/{plan_id}")
def delete_diet_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id,
        DietPlan.gym_id == staff.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")

    db.delete(plan)
    db.commit()
    return {"message": "Diet plan deleted"}


# ─────────────────────────────────────────────
# DIET PLANS — list all for gym
# ─────────────────────────────────────────────

@router.get("/diet-plans", response_model=List[DietPlanResponse])
def list_all_diet_plans(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plans = db.query(DietPlan).filter(
        DietPlan.gym_id == staff.gym_id
    ).order_by(DietPlan.created_at.desc()).all()
    return plans


# ─────────────────────────────────────────────
# WORKOUT PLAN — assigned members
# ─────────────────────────────────────────────

@router.get("/workout-plans/{plan_id}/members")
def get_workout_plan_members(
    plan_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    assignments = db.query(MemberPlanAssignment).filter(
        MemberPlanAssignment.workout_plan_id == plan_id,
        MemberPlanAssignment.gym_id == staff.gym_id
    ).all()
    member_ids = [a.member_id for a in assignments]
    members = db.query(Member).filter(Member.id.in_(member_ids)).all() if member_ids else []
    return [
        {
            "member_id": m.id,
            "name": m.name,
            "phone": m.phone,
            "assignment_id": next((a.id for a in assignments if a.member_id == m.id), None),
        }
        for m in members
    ]


@router.delete("/workout-plans/unassign/{member_id}")
def unassign_workout_plan(
    member_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    assignment = db.query(MemberPlanAssignment).filter(
        MemberPlanAssignment.member_id == member_id,
        MemberPlanAssignment.gym_id == staff.gym_id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    db.delete(assignment)
    db.commit()
    return {"message": "Workout plan unassigned"}


# ─────────────────────────────────────────────
# DIET PLAN — assign / unassign
# ─────────────────────────────────────────────

@router.delete("/diet-plans/unassign/{plan_id}")
def unassign_diet_plan(
    plan_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    plan = db.query(DietPlan).filter(
        DietPlan.id == plan_id,
        DietPlan.gym_id == staff.gym_id
    ).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Diet plan not found")
    db.delete(plan)
    db.commit()
    return {"message": "Diet plan removed from member"}


# ─────────────────────────────────────────────
# BODY MEASUREMENTS (admin input)
# ─────────────────────────────────────────────

@router.post("/body-measurements", response_model=BodyMeasurementResponse, status_code=201)
def record_body_measurement(
    payload: BodyMeasurementCreate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id, Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    measurement = BodyMeasurement(
        gym_id=staff.gym_id,
        member_id=payload.member_id,
        measured_at=payload.measured_at,
        weight=payload.weight,
        height=payload.height,
        chest=payload.chest,
        waist=payload.waist,
        hips=payload.hips,
        biceps=payload.biceps,
        thighs=payload.thighs,
        body_fat=payload.body_fat,
        notes=payload.notes,
        recorded_by=staff.id,
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.get("/body-measurements/{member_id}", response_model=List[BodyMeasurementResponse])
def get_member_measurements(
    member_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    return db.query(BodyMeasurement).filter(
        BodyMeasurement.member_id == member_id,
        BodyMeasurement.gym_id == staff.gym_id
    ).order_by(BodyMeasurement.measured_at.desc()).all()


@router.put("/body-measurements/{measurement_id}", response_model=BodyMeasurementResponse)
def update_body_measurement(
    measurement_id: str,
    payload: BodyMeasurementUpdate,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    m = db.query(BodyMeasurement).filter(
        BodyMeasurement.id == measurement_id,
        BodyMeasurement.gym_id == staff.gym_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(m, field, value)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/body-measurements/{measurement_id}")
def delete_body_measurement(
    measurement_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    m = db.query(BodyMeasurement).filter(
        BodyMeasurement.id == measurement_id,
        BodyMeasurement.gym_id == staff.gym_id
    ).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(m)
    db.commit()
    return {"message": "Measurement deleted"}

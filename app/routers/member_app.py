from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date

from app.database import get_db
from app.core.security import get_current_member
from app.core.feature_flags import get_plan_features, FEATURE_LABELS, UPGRADE_PLAN
from app.models import Member, WorkoutPlan, DietPlan, Payment, AttendanceLog, MemberPlanAssignment, Gym, BodyMeasurement, GymSubscription
from sqlalchemy import func
from fastapi.responses import Response
from app.services.receipt_service import generate_receipt_pdf

router = APIRouter(prefix="/member", tags=["Member App"])


# ─────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────

@router.get("/dashboard")
def member_dashboard(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    today = date.today()

    # Days until expiry
    days_left = None
    if member.plan_expiry:
        days_left = (member.plan_expiry - today).days

    # Total attendance
    total_attendance = db.query(func.count(AttendanceLog.id)).filter(
        AttendanceLog.member_id == member.id
    ).scalar() or 0

    # Attendance this month
    monthly_attendance = db.query(func.count(AttendanceLog.id)).filter(
        AttendanceLog.member_id == member.id,
        func.extract('month', AttendanceLog.checked_in_at) == today.month,
        func.extract('year', AttendanceLog.checked_in_at) == today.year,
    ).scalar() or 0

    # Checked in today?
    checked_in_today = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member.id,
        func.date(AttendanceLog.checked_in_at) == today
    ).first() is not None

    # Streak
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member.id
    ).order_by(AttendanceLog.checked_in_at.desc()).all()

    dates = sorted(set(l.checked_in_at.date() for l in logs), reverse=True)
    streak = 0
    for i, d in enumerate(dates):
        expected = date.fromordinal(today.toordinal() - i)
        if d == expected:
            streak += 1
        else:
            break

    # Last payment
    last_payment = db.query(Payment).filter(
        Payment.member_id == member.id
    ).order_by(Payment.created_at.desc()).first()

    gym = db.query(Gym).filter(Gym.id == member.gym_id).first()

    return {
        "member_id": member.id,
        "name": member.name,
        "phone": member.phone,
        "gym_name": gym.name if gym else "",
        "join_date": member.join_date,
        "plan_expiry": member.plan_expiry,
        "days_left": days_left,
        "is_expired": days_left is not None and days_left < 0,
        "checked_in_today": checked_in_today,
        "current_streak": streak,
        "total_attendance": total_attendance,
        "monthly_attendance": monthly_attendance,
        "last_payment": {
            "amount": float(last_payment.amount) if last_payment else None,
            "date": last_payment.payment_date if last_payment else None,
            "receipt": last_payment.receipt_number if last_payment else None,
        }
    }


# ─────────────────────────────────────────────
# WORKOUT PLAN
# ─────────────────────────────────────────────

@router.get("/workout")
def my_workout_plan(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    assignment = db.query(MemberPlanAssignment).filter(
        MemberPlanAssignment.member_id == member.id
    ).first()

    if not assignment or not assignment.workout_plan_id:
        return {"assigned": False, "message": "No workout plan assigned yet"}

    plan = db.query(WorkoutPlan).filter(
        WorkoutPlan.id == assignment.workout_plan_id
    ).first()

    if not plan:
        return {"assigned": False, "message": "Workout plan not found"}

    return {
        "assigned": True,
        "plan_id": plan.id,
        "plan_name": plan.name,
        "description": plan.description,
        "days": [
            {
                "day_name": d.day_name,
                "day_number": d.day_number,
                "exercises": d.exercises,
            }
            for d in sorted(plan.days, key=lambda x: x.day_number or 0)
        ]
    }


# ─────────────────────────────────────────────
# DIET PLAN
# ─────────────────────────────────────────────

@router.get("/diet")
def my_diet_plan(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    today = date.today()
    plan = db.query(DietPlan).filter(
        DietPlan.member_id == member.id
    ).order_by(DietPlan.created_at.desc()).first()

    if not plan:
        return {"assigned": False, "message": "No diet plan assigned yet"}

    return {
        "assigned": True,
        "plan_id": plan.id,
        "title": plan.title,
        "meals": plan.meals,
        "calories_target": plan.calories_target,
        "protein_target": plan.protein_target,
        "notes": plan.notes,
        "valid_from": plan.valid_from,
        "valid_to": plan.valid_to,
    }


# ─────────────────────────────────────────────
# PAYMENT HISTORY
# ─────────────────────────────────────────────

@router.get("/payments")
def my_payments(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    payments = db.query(Payment).filter(
        Payment.member_id == member.id
    ).order_by(Payment.created_at.desc()).all()

    return [
        {
            "id": p.id,
            "amount": float(p.amount),
            "date": p.payment_date,
            "mode": p.mode.value,
            "receipt_number": p.receipt_number,
            "valid_from": p.valid_from,
            "valid_to": p.valid_to,
            "notes": p.notes,
        }
        for p in payments
    ]


# ─────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────

@router.get("/profile")
def my_profile(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    gym = db.query(Gym).filter(Gym.id == member.gym_id).first()
    sub = db.query(GymSubscription).filter(GymSubscription.gym_id == member.gym_id).first()
    plan_name = sub.plan.value if sub else "basic"
    return {
        "id": member.id,
        "name": member.name,
        "phone": member.phone,
        "email": member.email,
        "dob": member.dob,
        "gender": member.gender,
        "join_date": member.join_date,
        "plan_expiry": member.plan_expiry,
        "profile_photo_url": member.profile_photo_url,
        "gym_name": gym.name if gym else "",
        "gym_address": gym.address if gym else "",
        "gym_phone": gym.phone if gym else "",
        "gym_logo_url": gym.logo_url if gym else None,
        "gym_plan": plan_name,
    }


# ─────────────────────────────────────────────
# MEMBER FEATURE FLAGS (plan-based)
# ─────────────────────────────────────────────

@router.get("/features")
def my_features(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """Returns the feature flags relevant to the member app."""
    sub = db.query(GymSubscription).filter(
        GymSubscription.gym_id == member.gym_id
    ).first()
    plan_name = sub.plan.value if sub else "basic"
    all_features = get_plan_features(plan_name)
    # Return only member-relevant features
    member_features = {k: v for k, v in all_features.items() if k.startswith("member_")}
    return {
        "plan": plan_name,
        "features": member_features,
        "labels": {k: v for k, v in FEATURE_LABELS.items() if k.startswith("member_")},
        "upgrade_map": {k: v for k, v in UPGRADE_PLAN.items() if k.startswith("member_")},
    }


# ─────────────────────────────────────────────
# PAYMENT RECEIPT DOWNLOAD (member side)
# ─────────────────────────────────────────────

@router.get("/payments/{payment_id}/receipt")
def download_my_receipt(
    payment_id: str,
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.member_id == member.id
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    pdf_bytes = generate_receipt_pdf(payment, member, member.gym_id, db)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=receipt-{payment.receipt_number}.pdf"}
    )


# ─────────────────────────────────────────────
# BODY MEASUREMENTS (member view)
# ─────────────────────────────────────────────

@router.get("/measurements")
def my_measurements(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    records = db.query(BodyMeasurement).filter(
        BodyMeasurement.member_id == member.id
    ).order_by(BodyMeasurement.measured_at.desc()).all()
    return [
        {
            "id": r.id,
            "measured_at": r.measured_at,
            "weight": float(r.weight) if r.weight else None,
            "height": float(r.height) if r.height else None,
            "chest": float(r.chest) if r.chest else None,
            "waist": float(r.waist) if r.waist else None,
            "hips": float(r.hips) if r.hips else None,
            "biceps": float(r.biceps) if r.biceps else None,
            "thighs": float(r.thighs) if r.thighs else None,
            "body_fat": float(r.body_fat) if r.body_fat else None,
            "notes": r.notes,
        }
        for r in records
    ]

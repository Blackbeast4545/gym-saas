import uuid
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import get_current_super_admin, hash_password
from app.models import Gym, GymSubscription, GymStaff, Member, Payment
from app.models.models import SubscriptionPlan, StaffRole
from app.schemas.gym_schemas import (
    GymCreate, GymUpdate, GymResponse,
    GymDetailResponse, SubscriptionUpdate, SubscriptionResponse
)
from app.services.qr_service import generate_gym_qr_token
from app.services.demo_seeder import seed_demo_gym

router = APIRouter(prefix="/super-admin", tags=["Super Admin"])

def _gym_detail(gym: Gym, db: Session) -> dict:
    member_count = db.query(func.count(Member.id)).filter(
        Member.gym_id == gym.id, Member.is_active == True
    ).scalar() or 0
    sub = None
    if gym.subscription:
        sub = {
            "id": gym.subscription.id, "gym_id": gym.id,
            "plan": gym.subscription.plan, "price_paid": float(gym.subscription.price_paid),
            "start_date": gym.subscription.start_date, "expiry_date": gym.subscription.expiry_date,
            "is_expired": gym.subscription.is_expired, "notes": gym.subscription.notes,
        }
    return {
        "id": gym.id, "name": gym.name, "owner_name": gym.owner_name,
        "phone": gym.phone, "email": gym.email, "address": gym.address,
        "city": gym.city, "logo_url": gym.logo_url, "is_active": gym.is_active,
        "qr_token": gym.qr_token, "created_at": gym.created_at,
        "subscription": sub, "total_members": member_count,
    }

@router.get("/dashboard")
def super_admin_dashboard(db: Session = Depends(get_db), _=Depends(get_current_super_admin)):
    total_gyms   = db.query(func.count(Gym.id)).scalar() or 0
    active_gyms  = db.query(func.count(Gym.id)).filter(Gym.is_active == True).scalar() or 0
    expired_gyms = db.query(func.count(GymSubscription.id)).filter(GymSubscription.is_expired == True).scalar() or 0
    total_members= db.query(func.count(Member.id)).filter(Member.is_active == True).scalar() or 0
    total_revenue= db.query(func.sum(GymSubscription.price_paid)).scalar() or 0
    plan_revenue = {}
    for plan in SubscriptionPlan:
        rev = db.query(func.sum(GymSubscription.price_paid)).filter(GymSubscription.plan == plan).scalar() or 0
        plan_revenue[plan.value] = float(rev)
    return {
        "total_gyms": total_gyms, "active_gyms": active_gyms,
        "inactive_gyms": total_gyms - active_gyms, "expired_subscriptions": expired_gyms,
        "total_members_across_platform": total_members, "total_revenue": float(total_revenue),
        "revenue_by_plan": plan_revenue,
    }

@router.post("/gyms", response_model=GymDetailResponse, status_code=201)
def create_gym(payload: GymCreate, db: Session = Depends(get_db), _=Depends(get_current_super_admin)):
    existing = db.query(Gym).filter(Gym.phone == payload.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="A gym with this phone already exists")
    qr_token = generate_gym_qr_token()
    gym = Gym(name=payload.name, owner_name=payload.owner_name, phone=payload.phone,
              email=payload.email, address=payload.address, city=payload.city,
              logo_url=payload.logo_url, is_active=True, qr_token=qr_token)
    db.add(gym); db.flush()
    sub = GymSubscription(gym_id=gym.id, plan=payload.plan, price_paid=payload.price_paid,
                          start_date=payload.start_date, expiry_date=payload.expiry_date, is_expired=False)
    db.add(sub)
    owner = GymStaff(gym_id=gym.id, name=payload.owner_name, phone=payload.phone,
                     email=payload.email, password_hash=hash_password(payload.owner_password),
                     role=StaffRole.owner, is_active=True)
    db.add(owner); db.commit(); db.refresh(gym)
    return _gym_detail(gym, db)

@router.get("/gyms", response_model=List[GymDetailResponse])
def list_gyms(is_active: Optional[bool]=None, plan: Optional[SubscriptionPlan]=None,
              search: Optional[str]=Query(None), skip: int=0, limit: int=50,
              db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    query = db.query(Gym)
    if is_active is not None: query = query.filter(Gym.is_active == is_active)
    if search: query = query.filter(Gym.name.ilike(f"%{search}%") | Gym.phone.ilike(f"%{search}%") | Gym.city.ilike(f"%{search}%"))
    if plan: query = query.join(GymSubscription).filter(GymSubscription.plan == plan)
    gyms = query.offset(skip).limit(limit).all()
    return [_gym_detail(g, db) for g in gyms]

@router.get("/gyms/{gym_id}", response_model=GymDetailResponse)
def get_gym(gym_id: str, db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym: raise HTTPException(status_code=404, detail="Gym not found")
    return _gym_detail(gym, db)

@router.put("/gyms/{gym_id}", response_model=GymDetailResponse)
def update_gym(gym_id: str, payload: GymUpdate, db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym: raise HTTPException(status_code=404, detail="Gym not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(gym, field, value)
    db.commit(); db.refresh(gym)
    return _gym_detail(gym, db)

@router.delete("/gyms/{gym_id}")
def delete_gym(gym_id: str, db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym: raise HTTPException(status_code=404, detail="Gym not found")
    db.delete(gym); db.commit()
    return {"message": "Gym deleted successfully"}

@router.patch("/gyms/{gym_id}/toggle-access")
def toggle_gym_access(gym_id: str, db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym: raise HTTPException(status_code=404, detail="Gym not found")
    gym.is_active = not gym.is_active
    db.commit()
    return {"gym_id": gym_id, "is_active": gym.is_active,
            "message": f"Gym {'enabled' if gym.is_active else 'disabled'} successfully"}

@router.put("/gyms/{gym_id}/subscription", response_model=SubscriptionResponse)
def update_subscription(gym_id: str, payload: SubscriptionUpdate,
                        db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    gym = db.query(Gym).filter(Gym.id == gym_id).first()
    if not gym: raise HTTPException(status_code=404, detail="Gym not found")
    sub = db.query(GymSubscription).filter(GymSubscription.gym_id == gym_id).first()
    if sub:
        sub.plan=payload.plan; sub.price_paid=payload.price_paid
        sub.start_date=payload.start_date; sub.expiry_date=payload.expiry_date
        sub.is_expired=False; sub.notes=payload.notes
    else:
        sub = GymSubscription(gym_id=gym_id, plan=payload.plan, price_paid=payload.price_paid,
                              start_date=payload.start_date, expiry_date=payload.expiry_date,
                              is_expired=False, notes=payload.notes)
        db.add(sub)
    if not gym.is_active: gym.is_active = True
    db.commit(); db.refresh(sub)
    return sub

@router.get("/gyms/{gym_id}/subscription", response_model=SubscriptionResponse)
def get_subscription(gym_id: str, db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    sub = db.query(GymSubscription).filter(GymSubscription.gym_id == gym_id).first()
    if not sub: raise HTTPException(status_code=404, detail="No subscription found")
    return sub

@router.get("/revenue")
def revenue_report(db: Session=Depends(get_db), _=Depends(get_current_super_admin)):
    subs = db.query(GymSubscription).all()
    total = sum(float(s.price_paid) for s in subs)
    by_plan = {}
    for plan in SubscriptionPlan:
        plan_subs = [s for s in subs if s.plan == plan]
        by_plan[plan.value] = {"count": len(plan_subs), "total": sum(float(s.price_paid) for s in plan_subs)}
    return {"total_revenue": total, "active_revenue": sum(float(s.price_paid) for s in subs if not s.is_expired),
            "expired_revenue": sum(float(s.price_paid) for s in subs if s.is_expired),
            "by_plan": by_plan, "total_subscriptions": len(subs)}


# ─────────────────────────────────────────────
# DEMO GYM SEEDER
# ─────────────────────────────────────────────

@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db), _=Depends(get_current_super_admin)):
    """Creates a fully populated demo gym with 15 members, payments, attendance, etc."""
    gym_id = seed_demo_gym(db)
    return {
        "message": "Demo gym created successfully",
        "gym_id": gym_id,
        "credentials": {
            "phone": "9999999999",
            "password": "demo1234",
        },
    }

from pydantic import BaseModel, EmailStr, condecimal
from typing import Optional
from datetime import date, datetime
from app.models.models import SubscriptionPlan


# ─────────────────────────────────────────────
# GYM SCHEMAS
# ─────────────────────────────────────────────

class GymCreate(BaseModel):
    name: str
    owner_name: str
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    # Initial subscription
    plan: SubscriptionPlan
    price_paid: float
    start_date: date
    expiry_date: date
    # Owner staff login password
    owner_password: str


class GymUpdate(BaseModel):
    name: Optional[str] = None
    owner_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None


class GymResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    logo_url: Optional[str] = None
    is_active: bool
    qr_token: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# SUBSCRIPTION SCHEMAS
# ─────────────────────────────────────────────

class SubscriptionUpdate(BaseModel):
    plan: SubscriptionPlan
    price_paid: float
    start_date: date
    expiry_date: date
    notes: Optional[str] = None


class SubscriptionResponse(BaseModel):
    id: str
    gym_id: str
    plan: SubscriptionPlan
    price_paid: float
    start_date: date
    expiry_date: date
    is_expired: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# GYM DETAIL (gym + subscription together)
# ─────────────────────────────────────────────

class GymDetailResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    logo_url: Optional[str] = None
    is_active: bool
    qr_token: Optional[str]
    created_at: datetime
    subscription: Optional[SubscriptionResponse]
    total_members: int = 0

    class Config:
        from_attributes = True

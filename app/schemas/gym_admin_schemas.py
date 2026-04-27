from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from app.models.models import PaymentMode, StaffRole


# ─────────────────────────────────────────────
# MEMBER SCHEMAS
# ─────────────────────────────────────────────

class MemberCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    profile_photo_url: Optional[str] = None
    join_date: Optional[date] = None
    plan_expiry: Optional[date] = None
    membership_plan_id: Optional[str] = None


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    address: Optional[str] = None
    emergency_contact: Optional[str] = None
    profile_photo_url: Optional[str] = None
    plan_expiry: Optional[date] = None
    is_active: Optional[bool] = None


class MemberResponse(BaseModel):
    id: str
    gym_id: str
    name: str
    phone: str
    email: Optional[str]
    dob: Optional[date]
    gender: Optional[str]
    address: Optional[str]
    emergency_contact: Optional[str] = None
    profile_photo_url: Optional[str] = None
    join_date: Optional[date]
    plan_expiry: Optional[date]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# STAFF SCHEMAS
# ─────────────────────────────────────────────

class StaffCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    password: str
    role: StaffRole = StaffRole.receptionist


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[StaffRole] = None


class StaffResponse(BaseModel):
    id: str
    gym_id: str
    name: str
    phone: str
    email: Optional[str]
    role: StaffRole
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# MEMBERSHIP PLAN SCHEMAS
# ─────────────────────────────────────────────

class MembershipPlanCreate(BaseModel):
    name: str
    duration_days: int
    price: float
    description: Optional[str] = None


class MembershipPlanUpdate(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class MembershipPlanResponse(BaseModel):
    id: str
    gym_id: str
    name: str
    duration_days: int
    price: float
    description: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# PAYMENT SCHEMAS
# ─────────────────────────────────────────────

class PaymentCreate(BaseModel):
    member_id: str
    membership_plan_id: Optional[str] = None
    amount: float
    payment_date: date
    mode: PaymentMode = PaymentMode.cash
    notes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class PaymentUpdate(BaseModel):
    amount: Optional[float] = None
    mode: Optional[PaymentMode] = None
    notes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class PaymentResponse(BaseModel):
    id: str
    gym_id: str
    member_id: Optional[str]
    amount: float
    payment_date: date
    mode: PaymentMode
    receipt_number: str
    notes: Optional[str]
    valid_from: Optional[date]
    valid_to: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# WORKOUT SCHEMAS
# ─────────────────────────────────────────────

class ExerciseItem(BaseModel):
    name: str
    sets: Optional[int] = None
    reps: Optional[str] = None
    rest: Optional[str] = None
    notes: Optional[str] = None
    duration: Optional[str] = None


class WorkoutDayCreate(BaseModel):
    day_name: str
    day_number: Optional[int] = None
    exercises: List[ExerciseItem]


class WorkoutPlanCreate(BaseModel):
    name: str
    description: Optional[str] = None
    days: List[WorkoutDayCreate]


class WorkoutPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    days: Optional[List[WorkoutDayCreate]] = None


class WorkoutDayResponse(BaseModel):
    id: str
    day_name: str
    day_number: Optional[int]
    exercises: List[Any]

    class Config:
        from_attributes = True


class WorkoutPlanResponse(BaseModel):
    id: str
    gym_id: str
    name: str
    description: Optional[str]
    is_active: bool
    days: List[WorkoutDayResponse]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# DIET SCHEMAS
# ─────────────────────────────────────────────

class MealItem(BaseModel):
    food: str
    quantity: Optional[str] = None
    calories: Optional[int] = None
    protein: Optional[int] = None
    notes: Optional[str] = None


class DietPlanCreate(BaseModel):
    member_id: str
    title: str
    meals: dict  # {"breakfast": [...], "lunch": [...], "dinner": [...]}
    calories_target: Optional[int] = None
    protein_target: Optional[int] = None
    notes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class DietPlanUpdate(BaseModel):
    title: Optional[str] = None
    meals: Optional[dict] = None
    calories_target: Optional[int] = None
    protein_target: Optional[int] = None
    notes: Optional[str] = None
    valid_from: Optional[date] = None
    valid_to: Optional[date] = None


class DietPlanResponse(BaseModel):
    id: str
    gym_id: str
    member_id: str
    title: str
    meals: dict
    calories_target: Optional[int]
    protein_target: Optional[int]
    notes: Optional[str]
    valid_from: Optional[date]
    valid_to: Optional[date]
    created_at: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────
# PLAN ASSIGNMENT
# ─────────────────────────────────────────────

class PlanAssignmentCreate(BaseModel):
    member_id: str
    workout_plan_id: Optional[str] = None


# ─────────────────────────────────────────────
# GYM SETTINGS (for gym owner self-service)
# ─────────────────────────────────────────────

class GymSettingsResponse(BaseModel):
    id: str
    name: str
    owner_name: str
    phone: str
    email: Optional[str]
    address: Optional[str]
    city: Optional[str]
    logo_url: Optional[str]
    qr_token: Optional[str]
    subscription_plan: Optional[str] = None
    subscription_expiry: Optional[date] = None
    is_active: bool

    class Config:
        from_attributes = True


class GymSettingsUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    logo_url: Optional[str] = None


# ─────────────────────────────────────────────
# BODY MEASUREMENT SCHEMAS
# ─────────────────────────────────────────────

class BodyMeasurementCreate(BaseModel):
    member_id: str
    measured_at: date
    weight: Optional[float] = None
    height: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    biceps: Optional[float] = None
    thighs: Optional[float] = None
    body_fat: Optional[float] = None
    notes: Optional[str] = None


class BodyMeasurementUpdate(BaseModel):
    measured_at: Optional[date] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    biceps: Optional[float] = None
    thighs: Optional[float] = None
    body_fat: Optional[float] = None
    notes: Optional[str] = None


class BodyMeasurementResponse(BaseModel):
    id: str
    gym_id: str
    member_id: str
    measured_at: date
    weight: Optional[float]
    height: Optional[float]
    chest: Optional[float]
    waist: Optional[float]
    hips: Optional[float]
    biceps: Optional[float]
    thighs: Optional[float]
    body_fat: Optional[float]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

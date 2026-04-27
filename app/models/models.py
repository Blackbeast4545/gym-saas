import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, DateTime, Date,
    Integer, ForeignKey, Text, Numeric, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class SubscriptionPlan(str, enum.Enum):
    basic = "basic"
    pro = "pro"
    premium = "premium"


class StaffRole(str, enum.Enum):
    owner = "owner"
    receptionist = "receptionist"
    trainer = "trainer"


class PaymentMode(str, enum.Enum):
    cash = "cash"
    upi = "upi"
    card = "card"
    bank_transfer = "bank_transfer"
    other = "other"


class NotificationType(str, enum.Enum):
    sms = "sms"
    whatsapp = "whatsapp"
    push = "push"


class NotificationStatus(str, enum.Enum):
    sent = "sent"
    failed = "failed"
    pending = "pending"


class AttendanceMethod(str, enum.Enum):
    qr_scan = "qr_scan"
    manual = "manual"


# ─────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────

def gen_uuid():
    return str(uuid.uuid4())


# ─────────────────────────────────────────────
# SUPER ADMIN
# ─────────────────────────────────────────────

class SuperAdmin(Base):
    __tablename__ = "super_admins"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False, default="Super Admin")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─────────────────────────────────────────────
# GYMS
# ─────────────────────────────────────────────

class Gym(Base):
    __tablename__ = "gyms"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String(200), nullable=False)
    owner_name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    address = Column(Text, nullable=True)
    city = Column(String(100), nullable=True)
    logo_url = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    qr_token = Column(String(100), unique=True, nullable=True)  # for QR attendance
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    subscription = relationship("GymSubscription", back_populates="gym", uselist=False)
    staff = relationship("GymStaff", back_populates="gym")
    members = relationship("Member", back_populates="gym")
    membership_plans = relationship("MembershipPlan", back_populates="gym")
    attendance_logs = relationship("AttendanceLog", back_populates="gym")
    payments = relationship("Payment", back_populates="gym")
    workout_plans = relationship("WorkoutPlan", back_populates="gym")
    notifications = relationship("NotificationLog", back_populates="gym")


class GymSubscription(Base):
    __tablename__ = "gym_subscriptions"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), unique=True)
    plan = Column(SAEnum(SubscriptionPlan), nullable=False, default=SubscriptionPlan.basic)
    price_paid = Column(Numeric(10, 2), nullable=False)
    start_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False)
    is_expired = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    gym = relationship("Gym", back_populates="subscription")


# ─────────────────────────────────────────────
# GYM STAFF
# ─────────────────────────────────────────────

class GymStaff(Base):
    __tablename__ = "gym_staff"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(StaffRole), nullable=False, default=StaffRole.receptionist)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    gym = relationship("Gym", back_populates="staff")


# ─────────────────────────────────────────────
# MEMBERS
# ─────────────────────────────────────────────

class Member(Base):
    __tablename__ = "members"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(15), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    dob = Column(Date, nullable=True)
    gender = Column(String(10), nullable=True)
    address = Column(Text, nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    emergency_contact = Column(String(15), nullable=True)
    join_date = Column(Date, nullable=False, default=datetime.utcnow)
    plan_expiry = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    fcm_token = Column(String(500), nullable=True)  # for push notifications
    created_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    gym = relationship("Gym", back_populates="members")
    attendance_logs = relationship("AttendanceLog", back_populates="member")
    payments = relationship("Payment", back_populates="member")
    plan_assignment = relationship("MemberPlanAssignment", back_populates="member", uselist=False)
    notifications = relationship("NotificationLog", back_populates="member")


# ─────────────────────────────────────────────
# MEMBERSHIP PLANS
# ─────────────────────────────────────────────

class MembershipPlan(Base):
    __tablename__ = "membership_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    duration_days = Column(Integer, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    gym = relationship("Gym", back_populates="membership_plans")


# ─────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────

class AttendanceLog(Base):
    __tablename__ = "attendance_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    checked_in_at = Column(DateTime(timezone=True), server_default=func.now())
    method = Column(SAEnum(AttendanceMethod), default=AttendanceMethod.qr_scan)
    notes = Column(String(200), nullable=True)

    gym = relationship("Gym", back_populates="attendance_logs")
    member = relationship("Member", back_populates="attendance_logs")


# ─────────────────────────────────────────────
# PAYMENTS
# ─────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="SET NULL"), nullable=True, index=True)
    membership_plan_id = Column(UUID(as_uuid=False), ForeignKey("membership_plans.id"), nullable=True)
    amount = Column(Numeric(10, 2), nullable=False)
    payment_date = Column(Date, nullable=False)
    mode = Column(SAEnum(PaymentMode), nullable=False, default=PaymentMode.cash)
    receipt_number = Column(String(50), unique=True, nullable=False)
    notes = Column(Text, nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    recorded_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    gym = relationship("Gym", back_populates="payments")
    member = relationship("Member", back_populates="payments")


# ─────────────────────────────────────────────
# WORKOUT PLANS
# ─────────────────────────────────────────────

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    gym = relationship("Gym", back_populates="workout_plans")
    days = relationship("WorkoutDay", back_populates="plan", cascade="all, delete-orphan")


class WorkoutDay(Base):
    __tablename__ = "workout_days"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    plan_id = Column(UUID(as_uuid=False), ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False)
    day_name = Column(String(20), nullable=False)   # Monday, Tuesday, etc.
    day_number = Column(Integer, nullable=True)      # 1-7
    exercises = Column(JSONB, nullable=False, default=list)
    # exercises format: [{"name": "Bench Press", "sets": 3, "reps": "10-12", "rest": "60s", "notes": ""}]

    plan = relationship("WorkoutPlan", back_populates="days")


# ─────────────────────────────────────────────
# DIET PLANS
# ─────────────────────────────────────────────

class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(150), nullable=False)
    meals = Column(JSONB, nullable=False, default=dict)
    # meals format: {"breakfast": [...], "lunch": [...], "dinner": [...], "snacks": [...]}
    calories_target = Column(Integer, nullable=True)
    protein_target = Column(Integer, nullable=True)
    notes = Column(Text, nullable=True)
    assigned_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    valid_from = Column(Date, nullable=True)
    valid_to = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


# ─────────────────────────────────────────────
# MEMBER PLAN ASSIGNMENT
# ─────────────────────────────────────────────

class MemberPlanAssignment(Base):
    __tablename__ = "member_plan_assignments"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, unique=True)
    workout_plan_id = Column(UUID(as_uuid=False), ForeignKey("workout_plans.id"), nullable=True)
    assigned_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    member = relationship("Member", back_populates="plan_assignment")


# ─────────────────────────────────────────────
# NOTIFICATIONS LOG
# ─────────────────────────────────────────────

class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="SET NULL"), nullable=True, index=True)
    notification_type = Column(SAEnum(NotificationType), nullable=False)
    title = Column(String(200), nullable=True)
    message = Column(Text, nullable=False)
    status = Column(SAEnum(NotificationStatus), default=NotificationStatus.pending)
    error_message = Column(Text, nullable=True)
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    gym = relationship("Gym", back_populates="notifications")
    member = relationship("Member", back_populates="notifications")


# ─────────────────────────────────────────────
# BODY MEASUREMENTS
# ─────────────────────────────────────────────

class BodyMeasurement(Base):
    __tablename__ = "body_measurements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    member_id = Column(UUID(as_uuid=False), ForeignKey("members.id", ondelete="CASCADE"), nullable=False, index=True)
    measured_at = Column(Date, nullable=False)
    weight = Column(Numeric(5, 1), nullable=True)       # kg
    height = Column(Numeric(5, 1), nullable=True)        # cm
    chest = Column(Numeric(5, 1), nullable=True)         # cm
    waist = Column(Numeric(5, 1), nullable=True)         # cm
    hips = Column(Numeric(5, 1), nullable=True)          # cm
    biceps = Column(Numeric(5, 1), nullable=True)        # cm
    thighs = Column(Numeric(5, 1), nullable=True)        # cm
    body_fat = Column(Numeric(4, 1), nullable=True)      # %
    notes = Column(Text, nullable=True)
    recorded_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ─────────────────────────────────────────────
# GYM ANNOUNCEMENTS
# ─────────────────────────────────────────────

class GymAnnouncement(Base):
    __tablename__ = "gym_announcements"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    gym_id = Column(UUID(as_uuid=False), ForeignKey("gyms.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), nullable=True, default="general")  # general, holiday, event, batch, maintenance
    is_active = Column(Boolean, default=True)
    created_by = Column(UUID(as_uuid=False), ForeignKey("gym_staff.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)

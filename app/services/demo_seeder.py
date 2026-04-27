"""
FitNexus Demo Gym Seeder
────────────────────────
Creates a demo gym with 15 members, payments, attendance,
workout plans, diet plans, body measurements.

Demo credentials:
  Gym ID field: 9999999999
  Phone:        9999999999
  Password:     demo1234
"""

import random
import logging
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Gym, GymSubscription, GymStaff, Member, MembershipPlan,
    Payment, AttendanceLog, WorkoutPlan, WorkoutDay, DietPlan,
    MemberPlanAssignment, BodyMeasurement, GymAnnouncement
)
from app.models.models import SubscriptionPlan, StaffRole, PaymentMode, AttendanceMethod
from app.services.qr_service import generate_gym_qr_token

logger = logging.getLogger(__name__)

DEMO_GYM_PHONE = "9999999999"
DEMO_PASSWORD = "demo1234"

MEMBER_NAMES = [
    ("Rahul Sharma", "9876543201", "male"),
    ("Priya Patel", "9876543202", "female"),
    ("Amit Singh", "9876543203", "male"),
    ("Neha Gupta", "9876543204", "female"),
    ("Vikram Reddy", "9876543205", "male"),
    ("Anjali Mehta", "9876543206", "female"),
    ("Rohit Kumar", "9876543207", "male"),
    ("Sneha Joshi", "9876543208", "female"),
    ("Arjun Nair", "9876543209", "male"),
    ("Kavita Desai", "9876543210", "female"),
    ("Deepak Yadav", "9876543211", "male"),
    ("Ritu Agarwal", "9876543212", "female"),
    ("Manish Tiwari", "9876543213", "male"),
    ("Pooja Mishra", "9876543214", "female"),
    ("Suresh Patil", "9876543215", "male"),
]

EXERCISES = {
    "Chest": [
        {"name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90s"},
        {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest": "60s"},
        {"name": "Cable Flyes", "sets": 3, "reps": "12-15", "rest": "45s"},
        {"name": "Push Ups", "sets": 3, "reps": "15-20", "rest": "30s"},
    ],
    "Back": [
        {"name": "Deadlift", "sets": 4, "reps": "6-8", "rest": "120s"},
        {"name": "Lat Pulldown", "sets": 3, "reps": "10-12", "rest": "60s"},
        {"name": "Barbell Row", "sets": 3, "reps": "8-10", "rest": "90s"},
        {"name": "Face Pulls", "sets": 3, "reps": "15", "rest": "30s"},
    ],
    "Legs": [
        {"name": "Squat", "sets": 4, "reps": "8-10", "rest": "120s"},
        {"name": "Leg Press", "sets": 3, "reps": "12-15", "rest": "60s"},
        {"name": "Lunges", "sets": 3, "reps": "10 each", "rest": "60s"},
        {"name": "Leg Curl", "sets": 3, "reps": "12", "rest": "45s"},
    ],
    "Shoulders": [
        {"name": "Overhead Press", "sets": 4, "reps": "8-10", "rest": "90s"},
        {"name": "Lateral Raise", "sets": 3, "reps": "12-15", "rest": "30s"},
        {"name": "Front Raise", "sets": 3, "reps": "12", "rest": "30s"},
    ],
    "Arms": [
        {"name": "Barbell Curl", "sets": 3, "reps": "10-12", "rest": "60s"},
        {"name": "Tricep Pushdown", "sets": 3, "reps": "12-15", "rest": "45s"},
        {"name": "Hammer Curl", "sets": 3, "reps": "10", "rest": "45s"},
    ],
}


def _ensure_trainer_enum(db: Session):
    """Add 'trainer' to PostgreSQL staffrole enum if it doesn't exist."""
    try:
        result = db.execute(text(
            "SELECT 1 FROM pg_enum WHERE enumlabel = 'trainer' "
            "AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'staffrole')"
        )).fetchone()
        if not result:
            db.execute(text("ALTER TYPE staffrole ADD VALUE IF NOT EXISTS 'trainer'"))
            db.commit()
            logger.info("[DEMO] Added 'trainer' to staffrole enum")
        else:
            logger.info("[DEMO] 'trainer' enum already exists")
    except Exception as e:
        logger.warning(f"[DEMO] Could not add trainer enum: {e}")
        db.rollback()


def seed_demo_gym(db: Session):
    """Create a fully populated demo gym."""

    # Check if demo gym already exists
    existing = db.query(Gym).filter(Gym.phone == DEMO_GYM_PHONE).first()
    if existing:
        return existing.id

    # Ensure trainer enum exists in PostgreSQL
    _ensure_trainer_enum(db)

    today = date.today()

    # ── 1. GYM ──
    gym = Gym(
        name="FitNexus Demo Gym",
        owner_name="Demo Owner",
        phone=DEMO_GYM_PHONE,
        email="demo@fitnexus.in",
        address="123 MG Road, Navrangpura",
        city="Ahmedabad",
        is_active=True,
        qr_token=generate_gym_qr_token(),
    )
    db.add(gym)
    db.flush()
    gym_id = gym.id
    logger.info(f"[DEMO] Gym created: {gym_id}")

    # ── 2. SUBSCRIPTION (Pro) ──
    sub = GymSubscription(
        gym_id=gym_id,
        plan=SubscriptionPlan.pro,
        price_paid=2999,
        start_date=today - timedelta(days=30),
        expiry_date=today + timedelta(days=335),
        is_expired=False,
    )
    db.add(sub)

    # ── 3. STAFF ──
    owner = GymStaff(
        gym_id=gym_id, name="Demo Owner", phone=DEMO_GYM_PHONE,
        email="demo@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.owner, is_active=True,
    )
    receptionist = GymStaff(
        gym_id=gym_id, name="Meera Receptionist", phone="9876500002",
        email="reception@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.receptionist, is_active=True,
    )
    db.add_all([owner, receptionist])
    db.flush()
    trainer_id = owner.id  # fallback

    try:
        trainer = GymStaff(
            gym_id=gym_id, name="Raj Trainer", phone="9876500001",
            email="trainer@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
            role=StaffRole.trainer, is_active=True,
        )
        db.add(trainer)
        db.flush()
        trainer_id = trainer.id
        logger.info("[DEMO] Staff: owner + receptionist + trainer")
    except Exception as e:
        logger.warning(f"[DEMO] Trainer skipped (using owner as fallback): {e}")
        db.rollback()
        # After rollback, re-query the gym
        gym = db.query(Gym).filter(Gym.phone == DEMO_GYM_PHONE).first()
        if gym:
            gym_id = gym.id
            owner = db.query(GymStaff).filter(
                GymStaff.gym_id == gym_id, GymStaff.role == StaffRole.owner
            ).first()
            trainer_id = owner.id if owner else None

    # ── 4. MEMBERSHIP PLANS ──
    plans_data = [
        ("Monthly", 1, 999), ("Quarterly", 3, 2499),
        ("Half Yearly", 6, 4499), ("Annual", 12, 7999),
    ]
    mplans = []
    for name, months, price in plans_data:
        mp = MembershipPlan(
            gym_id=gym_id, name=name, duration_months=months,
            price=price, is_active=True,
        )
        db.add(mp)
        db.flush()
        mplans.append(mp)
    logger.info(f"[DEMO] {len(mplans)} membership plans")

    # ── 5. MEMBERS ──
    members = []
    for i, (name, phone, gender) in enumerate(MEMBER_NAMES):
        join_days_ago = random.randint(30, 365)
        join_date = today - timedelta(days=join_days_ago)
        plan = random.choice(mplans)
        expiry = join_date + timedelta(days=plan.duration_months * 30)
        if i >= 12:
            expiry = today - timedelta(days=random.randint(1, 30))

        m = Member(
            gym_id=gym_id, name=name, phone=phone,
            gender=gender,
            dob=date(random.randint(1990, 2005), random.randint(1, 12), random.randint(1, 28)),
            join_date=join_date, plan_expiry=expiry,
            is_active=expiry >= today,
        )
        db.add(m)
        db.flush()
        members.append(m)
    logger.info(f"[DEMO] {len(members)} members")

    # ── 6. PAYMENTS ──
    receipt_counter = 1000
    for m in members:
        plan = random.choice(mplans)
        mode = random.choice([PaymentMode.cash, PaymentMode.upi])
        receipt_counter += 1
        p = Payment(
            gym_id=gym_id, member_id=m.id, amount=plan.price,
            payment_date=m.join_date, mode=mode,
            receipt_number=f"REC-DEMO-{receipt_counter}",
            valid_from=m.join_date, valid_to=m.plan_expiry,
            notes=f"{plan.name} plan",
        )
        db.add(p)
    logger.info(f"[DEMO] {len(members)} payments")

    # ── 7. ATTENDANCE (last 30 days, active members) ──
    att_count = 0
    for m in members[:12]:
        for day_offset in range(30):
            d = today - timedelta(days=day_offset)
            if d.weekday() == 6:
                continue
            if random.random() < 0.75:
                att = AttendanceLog(
                    gym_id=gym_id, member_id=m.id, date=d,
                    check_in_time=datetime.combine(
                        d, datetime.min.time().replace(
                            hour=random.randint(6, 10),
                            minute=random.randint(0, 59)
                        )
                    ),
                    method=AttendanceMethod.qr_scan,
                )
                db.add(att)
                att_count += 1
    logger.info(f"[DEMO] {att_count} attendance records")

    # ── 8. WORKOUT PLANS ──
    plans_config = [
        ("Beginner Strength", "Perfect for new gym members", ["Chest", "Back", "Legs"]),
        ("Advanced Push-Pull", "Intermediate split routine", ["Chest", "Back", "Legs", "Shoulders", "Arms"]),
        ("Fat Loss Circuit", "High intensity circuit training", ["Chest", "Legs", "Back"]),
    ]
    workout_plans = []
    for wp_name, wp_desc, muscles in plans_config:
        wp = WorkoutPlan(gym_id=gym_id, name=wp_name, description=wp_desc, is_active=True)
        db.add(wp)
        db.flush()
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        for day_idx in range(min(len(days), len(muscles))):
            wd = WorkoutDay(
                workout_plan_id=wp.id,
                day_name=days[day_idx],
                day_number=day_idx + 1,
                exercises=EXERCISES.get(muscles[day_idx], EXERCISES["Chest"]),
            )
            db.add(wd)
        workout_plans.append(wp)
    logger.info(f"[DEMO] {len(workout_plans)} workout plans")

    # ── 9. ASSIGN WORKOUTS ──
    for i, m in enumerate(members[:9]):
        wp = workout_plans[i % len(workout_plans)]
        a = MemberPlanAssignment(gym_id=gym_id, member_id=m.id, workout_plan_id=wp.id)
        db.add(a)
    logger.info("[DEMO] 9 workout assignments")

    # ── 10. DIET PLANS ──
    diets = [
        {
            "title": "Weight Loss Diet", "cal": 1800, "pro": 120,
            "meals": {
                "breakfast": [{"food": "Oats with milk", "quantity": "1 bowl", "calories": 250}, {"food": "Boiled eggs", "quantity": "2 pcs", "calories": 140}],
                "lunch": [{"food": "Brown rice", "quantity": "1 cup", "calories": 200}, {"food": "Grilled chicken", "quantity": "150g", "calories": 250}, {"food": "Mixed salad", "quantity": "1 plate", "calories": 80}],
                "dinner": [{"food": "Chapati", "quantity": "2 pcs", "calories": 200}, {"food": "Dal", "quantity": "1 bowl", "calories": 150}, {"food": "Paneer sabzi", "quantity": "100g", "calories": 200}],
                "snacks": [{"food": "Protein shake", "quantity": "1 scoop", "calories": 120}, {"food": "Almonds", "quantity": "10 pcs", "calories": 70}],
            },
        },
        {
            "title": "Muscle Gain Diet", "cal": 2800, "pro": 180,
            "meals": {
                "breakfast": [{"food": "Banana shake", "quantity": "1 glass", "calories": 400}, {"food": "Omelette", "quantity": "3 eggs", "calories": 280}],
                "lunch": [{"food": "White rice", "quantity": "2 cups", "calories": 400}, {"food": "Chicken curry", "quantity": "200g", "calories": 350}, {"food": "Curd", "quantity": "1 bowl", "calories": 100}],
                "dinner": [{"food": "Chapati", "quantity": "3 pcs", "calories": 300}, {"food": "Fish/Paneer", "quantity": "200g", "calories": 300}, {"food": "Vegetables", "quantity": "1 bowl", "calories": 100}],
                "snacks": [{"food": "Protein bar", "quantity": "1 pc", "calories": 200}, {"food": "Dry fruits", "quantity": "50g", "calories": 200}],
            },
        },
    ]
    for i, m in enumerate(members[:6]):
        d = diets[i % 2]
        dp = DietPlan(
            gym_id=gym_id, member_id=m.id, title=d["title"],
            meals=d["meals"], calories_target=d["cal"], protein_target=d["pro"],
            valid_from=today - timedelta(days=14),
            valid_to=today + timedelta(days=76),
            notes="Drink 3-4 litres of water daily.",
        )
        db.add(dp)
    logger.info("[DEMO] 6 diet plans")

    # ── 11. BODY MEASUREMENTS ──
    bm_count = 0
    for m in members[:8]:
        base_w = random.uniform(60, 95)
        for mo in range(4):
            bm = BodyMeasurement(
                gym_id=gym_id, member_id=m.id,
                measured_at=today - timedelta(days=mo * 30),
                weight=round(base_w - mo * random.uniform(0.3, 1.2), 1),
                height=round(random.uniform(160, 185), 1),
                chest=round(random.uniform(88, 105) - mo * 0.5, 1),
                waist=round(random.uniform(76, 95) - mo * 0.8, 1),
                hips=round(random.uniform(90, 105), 1),
                biceps=round(random.uniform(28, 38) + mo * 0.3, 1),
                thighs=round(random.uniform(48, 60), 1),
                body_fat=round(random.uniform(15, 28) - mo * 0.5, 1),
                recorded_by=trainer_id,
                notes="Monthly assessment" if mo > 0 else "Initial assessment",
            )
            db.add(bm)
            bm_count += 1
    logger.info(f"[DEMO] {bm_count} body measurements")

    # ── 12. ANNOUNCEMENTS ──
    for title, body in [
        ("Gym Timing Change", "Morning batch starts at 5:30 AM from next week."),
        ("Holi Holiday", "Gym closed on 14th March for Holi. Happy Holi!"),
        ("New Equipment", "New dumbbells and Smith machine added!"),
    ]:
        db.add(GymAnnouncement(gym_id=gym_id, title=title, body=body))
    logger.info("[DEMO] 3 announcements")

    # ── COMMIT ──
    db.commit()
    logger.info(f"[DEMO] === DONE === Gym ID: {gym_id}")
    return gym_id


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        gid = seed_demo_gym(db)
        print(f"\nDemo Gym ID: {gid}")
        print(f"Login: Gym ID = 9999999999, Phone = 9999999999, Password = demo1234")
    finally:
        db.close()

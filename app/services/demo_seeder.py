"""
FitNexus Demo Gym Seeder
─────────────────────────
Creates a fully populated demo gym with realistic data.
Run: python -m app.services.demo_seeder
Or hit: POST /super-admin/seed-demo (super admin auth required)

Demo credentials after seeding:
  Gym ID:   DEMO-GYM
  Phone:    9999999999
  Password: demo1234
"""

import uuid
import random
from datetime import date, datetime, timedelta
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.core.security import hash_password
from app.models import (
    Gym, GymSubscription, GymStaff, Member, MembershipPlan,
    Payment, AttendanceLog, WorkoutPlan, WorkoutDay, DietPlan,
    MemberPlanAssignment, BodyMeasurement, GymAnnouncement
)
from app.models.models import (
    SubscriptionPlan, StaffRole, PaymentMode, AttendanceMethod
)
from app.services.qr_service import generate_gym_qr_token


# ── CONFIG ──
DEMO_GYM_PHONE = "9999999999"
DEMO_PASSWORD   = "demo1234"

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
    "Chest": [("Bench Press", "4", "8-10", "90s"), ("Incline Dumbbell Press", "3", "10-12", "60s"), ("Cable Flyes", "3", "12-15", "45s"), ("Push Ups", "3", "15-20", "30s")],
    "Back": [("Deadlift", "4", "6-8", "120s"), ("Lat Pulldown", "3", "10-12", "60s"), ("Barbell Row", "3", "8-10", "90s"), ("Face Pulls", "3", "15", "30s")],
    "Legs": [("Squat", "4", "8-10", "120s"), ("Leg Press", "3", "12-15", "60s"), ("Lunges", "3", "10 each", "60s"), ("Leg Curl", "3", "12", "45s")],
    "Shoulders": [("Overhead Press", "4", "8-10", "90s"), ("Lateral Raise", "3", "12-15", "30s"), ("Front Raise", "3", "12", "30s"), ("Rear Delt Flyes", "3", "15", "30s")],
    "Arms": [("Barbell Curl", "3", "10-12", "60s"), ("Tricep Pushdown", "3", "12-15", "45s"), ("Hammer Curl", "3", "10", "45s"), ("Overhead Tricep Extension", "3", "12", "45s")],
}


def seed_demo_gym(db: Session):
    """Create or reset the demo gym with all data."""

    # ── Check if demo gym already exists ──
    existing = db.query(Gym).filter(Gym.phone == DEMO_GYM_PHONE).first()
    if existing:
        print(f"[DEMO] Demo gym already exists (ID: {existing.id}). Skipping.")
        return existing.id

    today = date.today()
    qr_token = generate_gym_qr_token()

    # ── 1. Create Gym ──
    gym = Gym(
        name="FitNexus Demo Gym",
        owner_name="Demo Owner",
        phone=DEMO_GYM_PHONE,
        email="demo@fitnexus.in",
        address="123 MG Road, Navrangpura",
        city="Ahmedabad",
        is_active=True,
        qr_token=qr_token,
    )
    db.add(gym); db.flush()
    gym_id = gym.id
    print(f"[DEMO] Gym created: {gym_id}")

    # ── 2. Subscription (Pro plan) ──
    sub = GymSubscription(
        gym_id=gym_id,
        plan=SubscriptionPlan.pro,
        price_paid=2999,
        start_date=today - timedelta(days=30),
        expiry_date=today + timedelta(days=335),
        is_expired=False,
    )
    db.add(sub)

    # ── 3. Staff ──
    owner = GymStaff(
        gym_id=gym_id, name="Demo Owner", phone=DEMO_GYM_PHONE,
        email="demo@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.owner, is_active=True,
    )
    trainer = GymStaff(
        gym_id=gym_id, name="Raj Trainer", phone="9876500001",
        email="trainer@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.trainer, is_active=True,
    )
    receptionist = GymStaff(
        gym_id=gym_id, name="Meera Receptionist", phone="9876500002",
        email="reception@fitnexus.in", password_hash=hash_password(DEMO_PASSWORD),
        role=StaffRole.receptionist, is_active=True,
    )
    db.add_all([owner, trainer, receptionist])
    db.flush()
    print(f"[DEMO] Staff created: owner + trainer + receptionist")

    # ── 4. Membership Plans ──
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
        db.add(mp); db.flush()
        mplans.append(mp)
    print(f"[DEMO] {len(mplans)} membership plans created")

    # ── 5. Members ──
    members = []
    for i, (name, phone, gender) in enumerate(MEMBER_NAMES):
        join_days_ago = random.randint(30, 365)
        join_date = today - timedelta(days=join_days_ago)
        plan = random.choice(mplans)
        expiry = join_date + timedelta(days=plan.duration_months * 30)

        # Some members expired, some active
        if i >= 12:
            expiry = today - timedelta(days=random.randint(1, 30))

        m = Member(
            gym_id=gym_id, name=name, phone=phone,
            gender=gender, dob=date(random.randint(1990, 2005), random.randint(1, 12), random.randint(1, 28)),
            join_date=join_date, plan_expiry=expiry,
            is_active=expiry >= today,
        )
        db.add(m); db.flush()
        members.append(m)
    print(f"[DEMO] {len(members)} members created")

    # ── 6. Payments ──
    receipt_counter = 1000
    for m in members:
        plan = random.choice(mplans)
        mode = random.choice(list(PaymentMode))
        receipt_counter += 1
        p = Payment(
            gym_id=gym_id, member_id=m.id, amount=plan.price,
            payment_date=m.join_date, mode=mode,
            receipt_number=f"REC-DEMO-{receipt_counter}",
            valid_from=m.join_date,
            valid_to=m.plan_expiry,
            notes=f"{plan.name} plan",
        )
        db.add(p)
    print(f"[DEMO] {len(members)} payments created")

    # ── 7. Attendance (last 30 days) ──
    att_count = 0
    for m in members[:12]:  # active members only
        for day_offset in range(30):
            d = today - timedelta(days=day_offset)
            if d.weekday() == 6:  # skip Sundays
                continue
            # 75% chance of attendance
            if random.random() < 0.75:
                att = AttendanceLog(
                    gym_id=gym_id, member_id=m.id,
                    date=d,
                    check_in_time=datetime.combine(d, datetime.min.time().replace(hour=random.randint(6, 10), minute=random.randint(0, 59))),
                    method=random.choice([AttendanceMethod.qr_scan, AttendanceMethod.manual]),
                )
                db.add(att)
                att_count += 1
    print(f"[DEMO] {att_count} attendance records created")

    # ── 8. Workout Plans ──
    workout_plans = []
    plans_config = [
        ("Beginner Strength", "Perfect for new gym members", ["Chest", "Back", "Legs"]),
        ("Advanced Push-Pull", "Intermediate split routine", ["Chest", "Back", "Legs", "Shoulders", "Arms"]),
        ("Fat Loss Circuit", "High intensity circuit training", ["Chest", "Legs", "Back"]),
    ]
    for wp_name, wp_desc, muscle_groups in plans_config:
        wp = WorkoutPlan(gym_id=gym_id, name=wp_name, description=wp_desc, is_active=True)
        db.add(wp); db.flush()

        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
        for day_idx, (day_name, muscle) in enumerate(zip(days, muscle_groups * 2)):
            if day_idx >= len(days):
                break
            wd = WorkoutDay(
                workout_plan_id=wp.id, day_name=day_name,
                day_number=day_idx + 1,
                exercises=[
                    {"name": ex[0], "sets": int(ex[1]), "reps": ex[2], "rest": ex[3]}
                    for ex in EXERCISES.get(muscle, EXERCISES["Chest"])
                ]
            )
            db.add(wd)
        workout_plans.append(wp)
    print(f"[DEMO] {len(workout_plans)} workout plans created")

    # ── 9. Assign Workout Plans to Members ──
    for i, m in enumerate(members[:9]):
        wp = workout_plans[i % len(workout_plans)]
        assignment = MemberPlanAssignment(
            gym_id=gym_id, member_id=m.id, workout_plan_id=wp.id,
        )
        db.add(assignment)
    print(f"[DEMO] 9 workout plan assignments created")

    # ── 10. Diet Plans ──
    diet_templates = [
        {
            "title": "Weight Loss Diet", "calories_target": 1800, "protein_target": 120,
            "meals": {
                "breakfast": [{"food": "Oats with milk", "quantity": "1 bowl", "calories": 250}, {"food": "Boiled eggs", "quantity": "2 pcs", "calories": 140}],
                "lunch": [{"food": "Brown rice", "quantity": "1 cup", "calories": 200}, {"food": "Grilled chicken", "quantity": "150g", "calories": 250}, {"food": "Mixed salad", "quantity": "1 plate", "calories": 80}],
                "dinner": [{"food": "Chapati", "quantity": "2 pcs", "calories": 200}, {"food": "Dal", "quantity": "1 bowl", "calories": 150}, {"food": "Paneer sabzi", "quantity": "100g", "calories": 200}],
                "snacks": [{"food": "Protein shake", "quantity": "1 scoop", "calories": 120}, {"food": "Almonds", "quantity": "10 pcs", "calories": 70}],
            }
        },
        {
            "title": "Muscle Gain Diet", "calories_target": 2800, "protein_target": 180,
            "meals": {
                "breakfast": [{"food": "Banana shake with peanut butter", "quantity": "1 glass", "calories": 400}, {"food": "Omelette", "quantity": "3 egg", "calories": 280}],
                "lunch": [{"food": "White rice", "quantity": "2 cups", "calories": 400}, {"food": "Chicken curry", "quantity": "200g", "calories": 350}, {"food": "Curd", "quantity": "1 bowl", "calories": 100}],
                "dinner": [{"food": "Chapati", "quantity": "3 pcs", "calories": 300}, {"food": "Fish/Paneer", "quantity": "200g", "calories": 300}, {"food": "Vegetables", "quantity": "1 bowl", "calories": 100}],
                "snacks": [{"food": "Protein bar", "quantity": "1 pc", "calories": 200}, {"food": "Dry fruits mix", "quantity": "50g", "calories": 200}],
            }
        },
    ]

    for i, m in enumerate(members[:6]):
        template = diet_templates[i % len(diet_templates)]
        dp = DietPlan(
            gym_id=gym_id, member_id=m.id,
            title=template["title"],
            meals=template["meals"],
            calories_target=template["calories_target"],
            protein_target=template["protein_target"],
            valid_from=today - timedelta(days=14),
            valid_to=today + timedelta(days=76),
            notes="Drink 3-4 litres of water daily.",
        )
        db.add(dp)
    print(f"[DEMO] 6 diet plans assigned")

    # ── 11. Body Measurements ──
    bm_count = 0
    for m in members[:8]:
        base_weight = random.uniform(60, 95)
        for month_offset in range(4):
            d = today - timedelta(days=month_offset * 30)
            # Gradual improvement
            weight = base_weight - month_offset * random.uniform(0.3, 1.2)
            bm = BodyMeasurement(
                gym_id=gym_id, member_id=m.id,
                measured_at=d,
                weight=round(weight, 1),
                height=random.uniform(160, 185),
                chest=round(random.uniform(88, 105) - month_offset * 0.5, 1),
                waist=round(random.uniform(76, 95) - month_offset * 0.8, 1),
                hips=round(random.uniform(90, 105), 1),
                biceps=round(random.uniform(28, 38) + month_offset * 0.3, 1),
                thighs=round(random.uniform(48, 60), 1),
                body_fat=round(random.uniform(15, 28) - month_offset * 0.5, 1),
                recorded_by=trainer.id,
                notes="Monthly assessment" if month_offset > 0 else "Initial assessment",
            )
            db.add(bm)
            bm_count += 1
    print(f"[DEMO] {bm_count} body measurement records created")

    # ── 12. Announcements ──
    announcements = [
        ("Gym Timing Change", "Starting next week, morning batch will begin at 5:30 AM instead of 6:00 AM."),
        ("Holi Holiday", "Gym will remain closed on 14th March for Holi. Happy Holi to all members!"),
        ("New Equipment", "We have added new dumbbells and a Smith machine. Come try them out!"),
    ]
    for title, body in announcements:
        ann = GymAnnouncement(
            gym_id=gym_id, title=title, body=body,
        )
        db.add(ann)
    print(f"[DEMO] 3 announcements created")

    db.commit()
    print(f"\n{'='*50}")
    print(f"DEMO GYM READY!")
    print(f"{'='*50}")
    print(f"  Gym ID   : {gym_id}")
    print(f"  Admin URL: your-panel.vercel.app")
    print(f"  Phone    : {DEMO_GYM_PHONE}")
    print(f"  Password : {DEMO_PASSWORD}")
    print(f"  Members  : {len(members)} ({sum(1 for m in members if m.is_active)} active)")
    print(f"  Staff    : Owner + Trainer + Receptionist")
    print(f"  Plan     : Pro")
    print(f"{'='*50}")

    return gym_id


# CLI entry point
if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_demo_gym(db)
    finally:
        db.close()

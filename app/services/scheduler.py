"""
Scheduler service — runs as a separate Docker container.
Checks daily:
  1. Expire gym subscriptions past their expiry date → disable gym
  2. Notify members whose plan expires in 3 days
  3. Notify members whose plan expired today
"""

import time
from datetime import date
from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Gym, GymSubscription, Member
from app.services.notification_service import notify_member

scheduler = BlockingScheduler(timezone="Asia/Kolkata")


def get_db() -> Session:
    db = SessionLocal()
    try:
        return db
    except Exception:
        db.close()
        raise


# ─────────────────────────────────────────────
# JOB 1: Check and expire gym subscriptions
# ─────────────────────────────────────────────

def check_gym_subscriptions():
    db = SessionLocal()
    try:
        today = date.today()
        subs = db.query(GymSubscription).filter(
            GymSubscription.is_expired == False,
            GymSubscription.expiry_date < today
        ).all()

        for sub in subs:
            sub.is_expired = True
            gym = db.query(Gym).filter(Gym.id == sub.gym_id).first()
            if gym:
                gym.is_active = False
                print(f"[SCHEDULER] Gym '{gym.name}' subscription expired. Access disabled.")

        db.commit()
        print(f"[SCHEDULER] Checked gym subscriptions. {len(subs)} expired.")
    except Exception as e:
        print(f"[SCHEDULER ERROR] check_gym_subscriptions: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────────
# JOB 2: Notify members expiring in 3 days
# ─────────────────────────────────────────────

def notify_expiring_members():
    db = SessionLocal()
    try:
        today = date.today()
        in_3_days = date.fromordinal(today.toordinal() + 3)

        expiring = db.query(Member).filter(
            Member.is_active == True,
            Member.plan_expiry == in_3_days
        ).all()

        for member in expiring:
            gym = db.query(Gym).filter(Gym.id == member.gym_id, Gym.is_active == True).first()
            if not gym:
                continue

            title = "Membership Expiring Soon"
            message = (
                f"Hi {member.name}, your membership at {gym.name} expires on "
                f"{member.plan_expiry.strftime('%d %b %Y')}. "
                f"Please renew to continue your fitness journey!"
            )
            notify_member(db, member, title, message, channels=["sms", "whatsapp", "push"])

        print(f"[SCHEDULER] Sent expiry reminders to {len(expiring)} members.")
    except Exception as e:
        print(f"[SCHEDULER ERROR] notify_expiring_members: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────────
# JOB 3: Notify members whose plan expired today
# ─────────────────────────────────────────────

def notify_expired_members():
    db = SessionLocal()
    try:
        today = date.today()

        expired = db.query(Member).filter(
            Member.is_active == True,
            Member.plan_expiry == today
        ).all()

        for member in expired:
            gym = db.query(Gym).filter(Gym.id == member.gym_id, Gym.is_active == True).first()
            if not gym:
                continue

            title = "Membership Expired"
            message = (
                f"Hi {member.name}, your membership at {gym.name} has expired today. "
                f"Please contact the gym to renew and continue your workouts!"
            )
            notify_member(db, member, title, message, channels=["sms", "whatsapp", "push"])

        print(f"[SCHEDULER] Sent expiry notifications to {len(expired)} members.")
    except Exception as e:
        print(f"[SCHEDULER ERROR] notify_expired_members: {e}")
    finally:
        db.close()


# ─────────────────────────────────────────────
# REGISTER JOBS
# ─────────────────────────────────────────────

# Run at 8 AM IST every day
scheduler.add_job(check_gym_subscriptions, CronTrigger(hour=8, minute=0))
scheduler.add_job(notify_expiring_members, CronTrigger(hour=8, minute=5))
scheduler.add_job(notify_expired_members, CronTrigger(hour=8, minute=10))

if __name__ == "__main__":
    print("[SCHEDULER] Starting gym SaaS scheduler (IST timezone)...")
    # Run all jobs once on startup
    check_gym_subscriptions()
    notify_expiring_members()
    notify_expired_members()
    scheduler.start()

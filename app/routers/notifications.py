from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.core.security import get_current_gym_staff, get_current_member
from app.models import Member, NotificationLog, GymStaff
from app.services.notification_service import notify_member, bulk_notify_gym

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class BulkNotifyPayload(BaseModel):
    title: str
    message: str
    channels: List[str] = ["sms", "whatsapp", "push"]
    member_ids: Optional[List[str]] = None  # None = send to all


class SingleNotifyPayload(BaseModel):
    member_id: str
    title: str
    message: str
    channels: List[str] = ["sms", "whatsapp", "push"]


# ─────────────────────────────────────────────
# BULK SEND (gym admin)
# ─────────────────────────────────────────────

@router.post("/bulk")
def send_bulk_notification(
    payload: BulkNotifyPayload,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    if payload.member_ids:
        # Send to specific members
        success = 0
        for mid in payload.member_ids:
            member = db.query(Member).filter(
                Member.id == mid, Member.gym_id == staff.gym_id
            ).first()
            if member:
                results = notify_member(db, member, payload.title, payload.message, payload.channels)
                if any(results.values()):
                    success += 1
        return {"total": len(payload.member_ids), "success": success}
    else:
        # Send to all active members
        result = bulk_notify_gym(
            db, staff.gym_id, payload.title, payload.message, payload.channels
        )
        return result


@router.post("/send")
def send_single_notification(
    payload: SingleNotifyPayload,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id,
        Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    results = notify_member(db, member, payload.title, payload.message, payload.channels)
    return {"member_id": member.id, "results": results}


@router.get("/history")
def notification_history(
    member_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    query = db.query(NotificationLog).filter(NotificationLog.gym_id == staff.gym_id)
    if member_id:
        query = query.filter(NotificationLog.member_id == member_id)
    logs = query.order_by(NotificationLog.sent_at.desc()).offset(skip).limit(limit).all()
    return logs


# ─────────────────────────────────────────────
# MEMBER'S OWN NOTIFICATIONS (member app)
# ─────────────────────────────────────────────

@router.get("/my-notifications")
def my_notifications(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    logs = db.query(NotificationLog).filter(
        NotificationLog.member_id == member.id
    ).order_by(NotificationLog.sent_at.desc()).limit(50).all()

    return [
        {
            "id": l.id,
            "title": l.title,
            "message": l.message,
            "type": l.notification_type.value,
            "sent_at": l.sent_at,
        }
        for l in logs
    ]


# ─────────────────────────────────────────────
# UPDATE FCM TOKEN (member app on login)
# ─────────────────────────────────────────────

class FCMTokenUpdate(BaseModel):
    fcm_token: str


@router.post("/update-fcm-token")
def update_fcm_token(
    payload: FCMTokenUpdate,
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    member.fcm_token = payload.fcm_token
    db.commit()
    return {"message": "FCM token updated"}

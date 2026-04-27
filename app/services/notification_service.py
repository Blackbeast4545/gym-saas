from sqlalchemy.orm import Session
from app.models import Member, NotificationLog
from app.models.models import NotificationType, NotificationStatus
from app.services.otp_service import send_sms, send_whatsapp
import httpx
import json


# ─────────────────────────────────────────────
# FCM PUSH NOTIFICATION
# ─────────────────────────────────────────────

def send_push_notification(fcm_token: str, title: str, body: str, data: dict = None) -> dict:
    """Send Firebase Cloud Messaging push notification."""
    from app.core.config import settings
    try:
        import firebase_admin
        from firebase_admin import credentials, messaging

        # Initialize Firebase if not already done
        if not firebase_admin._apps:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_admin.initialize_app(cred)

        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=fcm_token,
        )
        response = messaging.send(message)
        return {"success": True, "message_id": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────
# LOG NOTIFICATION
# ─────────────────────────────────────────────

def log_notification(
    db: Session,
    gym_id: str,
    member_id: str,
    notification_type: NotificationType,
    message: str,
    title: str,
    status: NotificationStatus,
    error: str = None
):
    log = NotificationLog(
        gym_id=gym_id,
        member_id=member_id,
        notification_type=notification_type,
        title=title,
        message=message,
        status=status,
        error_message=error,
    )
    db.add(log)
    db.commit()


# ─────────────────────────────────────────────
# SEND TO ONE MEMBER (all channels)
# ─────────────────────────────────────────────

def notify_member(
    db: Session,
    member: Member,
    title: str,
    message: str,
    channels: list = None  # ["sms", "whatsapp", "push"]
):
    if channels is None:
        channels = ["sms", "whatsapp", "push"]

    results = {}

    if "sms" in channels:
        r = send_sms(member.phone, message)
        status = NotificationStatus.sent if r["success"] else NotificationStatus.failed
        log_notification(db, member.gym_id, member.id,
                         NotificationType.sms, message, title, status,
                         r.get("error"))
        results["sms"] = r["success"]

    if "whatsapp" in channels:
        r = send_whatsapp(member.phone, message)
        status = NotificationStatus.sent if r["success"] else NotificationStatus.failed
        log_notification(db, member.gym_id, member.id,
                         NotificationType.whatsapp, message, title, status,
                         r.get("error"))
        results["whatsapp"] = r["success"]

    if "push" in channels and member.fcm_token:
        r = send_push_notification(member.fcm_token, title, message)
        status = NotificationStatus.sent if r["success"] else NotificationStatus.failed
        log_notification(db, member.gym_id, member.id,
                         NotificationType.push, message, title, status,
                         r.get("error"))
        results["push"] = r["success"]

    return results


# ─────────────────────────────────────────────
# BULK NOTIFY (all members of a gym)
# ─────────────────────────────────────────────

def bulk_notify_gym(
    db: Session,
    gym_id: str,
    title: str,
    message: str,
    channels: list = None
):
    members = db.query(Member).filter(
        Member.gym_id == gym_id,
        Member.is_active == True
    ).all()

    total = len(members)
    success = 0

    for member in members:
        results = notify_member(db, member, title, message, channels)
        if any(results.values()):
            success += 1

    return {"total": total, "success": success, "failed": total - success}

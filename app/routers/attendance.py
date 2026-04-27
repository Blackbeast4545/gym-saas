from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import get_current_gym_staff, get_current_member
from app.models import Member, AttendanceLog, Gym, GymStaff
from app.models.models import AttendanceMethod
from app.services.qr_service import generate_qr_image_bytes
from pydantic import BaseModel

router = APIRouter(prefix="/attendance", tags=["Attendance"])


class QRScanPayload(BaseModel):
    qr_token: str      # the gym's QR token
    member_id: str     # member scanning in


class ManualAttendancePayload(BaseModel):
    member_id: str


# ─────────────────────────────────────────────
# QR CODE — get gym QR image
# ─────────────────────────────────────────────

@router.get("/qr-code")
def get_gym_qr_code(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    """Returns gym QR code as PNG image for printing/display."""
    gym = db.query(Gym).filter(Gym.id == staff.gym_id).first()
    if not gym or not gym.qr_token:
        raise HTTPException(status_code=404, detail="QR token not found for gym")

    # QR data encodes the gym token
    qr_data = f"FITNEXUS:CHECKIN:{gym.qr_token}"
    img_bytes = generate_qr_image_bytes(qr_data)

    return Response(
        content=img_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f"inline; filename=gym-qr-{gym.id[:8]}.png"}
    )


@router.get("/qr-token")
def get_gym_qr_token(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    """Returns the raw QR token (for Flutter app to generate QR locally)."""
    gym = db.query(Gym).filter(Gym.id == staff.gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found")
    return {
        "gym_id": gym.id,
        "gym_name": gym.name,
        "qr_token": gym.qr_token,
        "qr_data": f"FITNEXUS:CHECKIN:{gym.qr_token}"
    }


# ─────────────────────────────────────────────
# QR SCAN CHECK-IN (called by member app)
# ─────────────────────────────────────────────

@router.post("/scan")
def scan_qr_checkin(
    payload: QRScanPayload,
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    """Member scans gym QR to check in."""
    # Validate the QR token belongs to member's gym
    gym = db.query(Gym).filter(
        Gym.qr_token == payload.qr_token,
        Gym.id == member.gym_id
    ).first()
    if not gym:
        raise HTTPException(status_code=400, detail="Invalid QR code or wrong gym")

    # Verify member_id matches logged-in member
    if payload.member_id != member.id:
        raise HTTPException(status_code=403, detail="Member ID mismatch")

    # Prevent duplicate check-in on same day
    today = date.today()
    existing = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member.id,
        AttendanceLog.gym_id == member.gym_id,
        func.date(AttendanceLog.checked_in_at) == today
    ).first()

    if existing:
        return {
            "already_checked_in": True,
            "checked_in_at": existing.checked_in_at,
            "message": "You already checked in today"
        }

    # Check member plan hasn't expired
    if member.plan_expiry and member.plan_expiry < today:
        raise HTTPException(
            status_code=403,
            detail="Your membership has expired. Please renew to check in."
        )

    log = AttendanceLog(
        gym_id=member.gym_id,
        member_id=member.id,
        method=AttendanceMethod.qr_scan,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return {
        "success": True,
        "checked_in_at": log.checked_in_at,
        "message": f"Welcome, {member.name}! Check-in recorded.",
        "gym_name": gym.name,
    }


# ─────────────────────────────────────────────
# MANUAL CHECK-IN (by staff)
# ─────────────────────────────────────────────

@router.post("/manual")
def manual_checkin(
    payload: ManualAttendancePayload,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    member = db.query(Member).filter(
        Member.id == payload.member_id,
        Member.gym_id == staff.gym_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    today = date.today()
    existing = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member.id,
        func.date(AttendanceLog.checked_in_at) == today
    ).first()

    if existing:
        return {"already_checked_in": True, "message": "Member already checked in today"}

    log = AttendanceLog(
        gym_id=staff.gym_id,
        member_id=member.id,
        method=AttendanceMethod.manual,
    )
    db.add(log)
    db.commit()
    return {"success": True, "message": f"{member.name} checked in manually"}


# ─────────────────────────────────────────────
# ATTENDANCE HISTORY (for staff)
# ─────────────────────────────────────────────

@router.get("/today")
def todays_attendance(
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    today = date.today()
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.gym_id == staff.gym_id,
        func.date(AttendanceLog.checked_in_at) == today
    ).order_by(AttendanceLog.checked_in_at.desc()).all()

    # Batch fetch members to avoid N+1 queries
    member_ids = list(set(l.member_id for l in logs))
    members = {m.id: m for m in db.query(Member).filter(Member.id.in_(member_ids)).all()} if member_ids else {}

    result = []
    for log in logs:
        member = members.get(log.member_id)
        result.append({
            "log_id": log.id,
            "member_id": log.member_id,
            "member_name": member.name if member else "Unknown",
            "member_phone": member.phone if member else "",
            "profile_photo_url": member.profile_photo_url if member else None,
            "checked_in_at": log.checked_in_at,
            "method": log.method.value,
        })

    return {"date": today, "total": len(result), "logs": result}


@router.get("/history")
def attendance_history(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    """Get attendance history for the gym with date range filter."""
    query = db.query(AttendanceLog).filter(
        AttendanceLog.gym_id == staff.gym_id
    )
    if from_date:
        query = query.filter(func.date(AttendanceLog.checked_in_at) >= from_date)
    if to_date:
        query = query.filter(func.date(AttendanceLog.checked_in_at) <= to_date)

    logs = query.order_by(AttendanceLog.checked_in_at.desc()).offset(skip).limit(limit).all()

    # Batch fetch member names to avoid N+1
    member_ids = list(set(l.member_id for l in logs))
    members = {m.id: m for m in db.query(Member).filter(Member.id.in_(member_ids)).all()} if member_ids else {}

    result = []
    for log in logs:
        m = members.get(log.member_id)
        result.append({
            "log_id": log.id,
            "member_id": log.member_id,
            "member_name": m.name if m else "Unknown",
            "member_phone": m.phone if m else "",
            "profile_photo_url": m.profile_photo_url if m else None,
            "checked_in_at": log.checked_in_at,
            "method": log.method.value,
        })

    return {"total": len(result), "logs": result}


@router.get("/member/{member_id}/history")
def member_attendance_history(
    member_id: str,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    query = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member_id,
        AttendanceLog.gym_id == staff.gym_id
    )
    if from_date:
        query = query.filter(func.date(AttendanceLog.checked_in_at) >= from_date)
    if to_date:
        query = query.filter(func.date(AttendanceLog.checked_in_at) <= to_date)

    logs = query.order_by(AttendanceLog.checked_in_at.desc()).all()
    return {
        "member_id": member_id,
        "total_days": len(logs),
        "logs": [{"log_id": l.id, "date": l.checked_in_at, "method": l.method.value} for l in logs]
    }


@router.delete("/{log_id}")
def delete_attendance_log(
    log_id: str,
    db: Session = Depends(get_db),
    staff: GymStaff = Depends(get_current_gym_staff)
):
    """Delete an attendance record (staff only)."""
    log = db.query(AttendanceLog).filter(
        AttendanceLog.id == log_id,
        AttendanceLog.gym_id == staff.gym_id
    ).first()
    if not log:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    db.delete(log)
    db.commit()
    return {"message": "Attendance record deleted"}


# ─────────────────────────────────────────────
# MEMBER'S OWN HISTORY (member app)
# ─────────────────────────────────────────────

@router.get("/my-history")
def my_attendance_history(
    db: Session = Depends(get_db),
    member: Member = Depends(get_current_member)
):
    logs = db.query(AttendanceLog).filter(
        AttendanceLog.member_id == member.id
    ).order_by(AttendanceLog.checked_in_at.desc()).limit(90).all()

    # Build a streak count
    dates = sorted(set(l.checked_in_at.date() for l in logs), reverse=True)
    streak = 0
    today = date.today()
    for i, d in enumerate(dates):
        expected = date.fromordinal(today.toordinal() - i)
        if d == expected:
            streak += 1
        else:
            break

    return {
        "total_days": len(logs),
        "current_streak": streak,
        "logs": [{"date": l.checked_in_at, "method": l.method.value} for l in logs]
    }

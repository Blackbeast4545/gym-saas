from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import SuperAdmin, GymStaff, Member, Gym
from app.core.security import (
    verify_password, create_super_admin_token,
    create_gym_staff_token, create_member_token
)
from app.services.otp_service import send_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["Authentication"])

class SuperAdminLogin(BaseModel):
    email: str
    password: str

class GymStaffLogin(BaseModel):
    phone: str
    password: str
    gym_id: str

class MemberOTPRequest(BaseModel):
    phone: str
    gym_id: str

class MemberOTPVerify(BaseModel):
    phone: str
    gym_id: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    id: str

@router.post("/super-admin/login", response_model=TokenResponse)
def super_admin_login(payload: SuperAdminLogin, db: Session = Depends(get_db)):
    admin = db.query(SuperAdmin).filter(SuperAdmin.email == payload.email).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    token = create_super_admin_token(admin.id)
    return TokenResponse(access_token=token, role="super_admin", name=admin.name, id=admin.id)

@router.post("/gym/login", response_model=TokenResponse)
def gym_staff_login(payload: GymStaffLogin, db: Session = Depends(get_db)):
    # Check gym exists
    gym = db.query(Gym).filter(Gym.id == payload.gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found. Check your Gym ID.")

    # Check gym is active
    if not gym.is_active:
        raise HTTPException(
            status_code=403,
            detail="This gym has been disabled by the administrator. Please contact FitNexus support."
        )

    # Check subscription
    if gym.subscription and gym.subscription.is_expired:
        raise HTTPException(
            status_code=403,
            detail="Your gym subscription has expired. Please renew your FitNexus subscription to continue."
        )

    staff = db.query(GymStaff).filter(
        GymStaff.phone == payload.phone,
        GymStaff.gym_id == payload.gym_id,
        GymStaff.is_active == True
    ).first()

    if not staff or not verify_password(payload.password, staff.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")

    token = create_gym_staff_token(staff.id, staff.gym_id, staff.role.value)
    return TokenResponse(access_token=token, role=staff.role.value, name=staff.name, id=staff.id)

@router.post("/member/request-otp")
def member_request_otp(payload: MemberOTPRequest, db: Session = Depends(get_db)):
    gym = db.query(Gym).filter(Gym.id == payload.gym_id).first()
    if not gym:
        raise HTTPException(status_code=404, detail="Gym not found. Check your Gym ID.")
    if not gym.is_active:
        raise HTTPException(status_code=403, detail="This gym's subscription has expired or been disabled.")
    if gym.subscription and gym.subscription.is_expired:
        raise HTTPException(status_code=403, detail="This gym's subscription has expired.")

    member = db.query(Member).filter(
        Member.phone == payload.phone,
        Member.gym_id == payload.gym_id,
        Member.is_active == True
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="No active member found with this phone number in this gym")

    result = send_otp(payload.phone)
    if not result["success"]:
        raise HTTPException(status_code=500, detail="Failed to send OTP")
    return {"message": f"OTP sent to {payload.phone[-4:].rjust(10, '*')}"}

@router.post("/member/verify-otp", response_model=TokenResponse)
def member_verify_otp(payload: MemberOTPVerify, db: Session = Depends(get_db)):
    is_valid = verify_otp(payload.phone, payload.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    member = db.query(Member).filter(
        Member.phone == payload.phone,
        Member.gym_id == payload.gym_id,
        Member.is_active == True
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    token = create_member_token(member.id, member.gym_id)
    return TokenResponse(access_token=token, role="member", name=member.name, id=member.id)

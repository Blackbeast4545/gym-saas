from datetime import datetime, timedelta
from typing import Optional, Union
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database import get_db
from app.models import SuperAdmin, GymStaff, Member, Gym

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()


# ─────────────────────────────────────────────
# PASSWORD UTILS
# ─────────────────────────────────────────────

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ─────────────────────────────────────────────
# TOKEN CREATION
# ─────────────────────────────────────────────

def create_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_super_admin_token(admin_id: str) -> str:
    return create_token({"sub": admin_id, "role": "super_admin"})


def create_gym_staff_token(staff_id: str, gym_id: str, role: str) -> str:
    return create_token({"sub": staff_id, "gym_id": gym_id, "role": role})


def create_member_token(member_id: str, gym_id: str) -> str:
    return create_token({"sub": member_id, "gym_id": gym_id, "role": "member"})


# ─────────────────────────────────────────────
# TOKEN DECODE
# ─────────────────────────────────────────────

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


# ─────────────────────────────────────────────
# DEPENDENCIES — CURRENT USER PER ROLE
# ─────────────────────────────────────────────

def get_current_super_admin(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> SuperAdmin:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Not authorized as super admin")
    admin = db.query(SuperAdmin).filter(SuperAdmin.id == payload["sub"]).first()
    if not admin or not admin.is_active:
        raise HTTPException(status_code=401, detail="Super admin not found or inactive")
    return admin


def get_current_gym_staff(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> GymStaff:
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    if role not in ("owner", "receptionist", "trainer"):
        raise HTTPException(status_code=403, detail="Not authorized as gym staff")

    staff = db.query(GymStaff).filter(GymStaff.id == payload["sub"]).first()
    if not staff or not staff.is_active:
        raise HTTPException(status_code=401, detail="Staff not found or inactive")

    # Check gym subscription is still active
    gym = db.query(Gym).filter(Gym.id == staff.gym_id).first()
    if not gym or not gym.is_active:
        raise HTTPException(status_code=403, detail="Gym subscription expired or disabled")

    return staff


def get_current_gym_owner(
    staff: GymStaff = Depends(get_current_gym_staff)
) -> GymStaff:
    if staff.role.value != "owner":
        raise HTTPException(status_code=403, detail="Only gym owner can perform this action")
    return staff


def get_current_member(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Member:
    payload = decode_token(credentials.credentials)
    if payload.get("role") != "member":
        raise HTTPException(status_code=403, detail="Not authorized as member")

    member = db.query(Member).filter(Member.id == payload["sub"]).first()
    if not member or not member.is_active:
        raise HTTPException(status_code=401, detail="Member not found or inactive")

    # Check gym is still active
    gym = db.query(Gym).filter(Gym.id == member.gym_id).first()
    if not gym or not gym.is_active:
        raise HTTPException(status_code=403, detail="Gym subscription expired")

    return member

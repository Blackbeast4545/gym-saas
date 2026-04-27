"""
Demo Guard Middleware
─────────────────────
Blocks all write operations (POST, PUT, PATCH, DELETE) for the demo gym.
Read-only access only — gym owners can click and explore everything
but cannot modify any data.

The demo gym is identified by the DEMO_GYM_PHONE in the staff/member JWT token.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.security import decode_token
from app.database import SessionLocal
from app.models import Gym

# Demo gym phone — must match the one in demo_seeder.py
DEMO_GYM_PHONE = "9999999999"

# Cache the demo gym ID after first lookup
_demo_gym_id: str | None = None


def _get_demo_gym_id() -> str | None:
    """Lookup demo gym ID from DB (cached after first call)."""
    global _demo_gym_id
    if _demo_gym_id is not None:
        return _demo_gym_id

    db = SessionLocal()
    try:
        gym = db.query(Gym).filter(Gym.phone == DEMO_GYM_PHONE).first()
        if gym:
            _demo_gym_id = gym.id
            return _demo_gym_id
    finally:
        db.close()
    return None


# Routes that are always allowed even for demo (login, health, etc.)
ALWAYS_ALLOWED_PATHS = {
    "/", "/health", "/docs", "/openapi.json",
}

# Prefixes that are always allowed (auth endpoints)
ALWAYS_ALLOWED_PREFIXES = [
    "/api/v1/auth/",
    "/api/v1/super-admin/",  # super admin can still manage demo gym
]


def is_demo_request(request: Request) -> bool:
    """Check if this request is from a demo gym user."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return False

    token = auth_header.split(" ", 1)[1]
    try:
        payload = decode_token(token)
    except Exception:
        return False

    # Check if this token belongs to the demo gym
    token_gym_id = payload.get("gym_id")
    if not token_gym_id:
        return False

    demo_id = _get_demo_gym_id()
    return demo_id is not None and token_gym_id == demo_id


async def demo_guard_middleware(request: Request, call_next):
    """
    Middleware that blocks write operations for demo gym users.
    Returns a friendly JSON error that the frontend can show as a toast.
    """
    path = request.url.path
    method = request.method.upper()

    # Always allow GET, OPTIONS, HEAD
    if method in ("GET", "OPTIONS", "HEAD"):
        return await call_next(request)

    # Always allow certain paths
    if path in ALWAYS_ALLOWED_PATHS:
        return await call_next(request)

    for prefix in ALWAYS_ALLOWED_PREFIXES:
        if path.startswith(prefix):
            return await call_next(request)

    # For write methods, check if this is a demo gym request
    if method in ("POST", "PUT", "PATCH", "DELETE"):
        if is_demo_request(request):
            return JSONResponse(
                status_code=403,
                content={
                    "detail": "This is a demo account — view only. Contact us at 9054579013 to get your own gym set up!",
                    "demo_mode": True,
                }
            )

    return await call_next(request)

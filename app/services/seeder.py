from sqlalchemy.orm import Session
from app.models import SuperAdmin
from app.core.security import hash_password
from app.core.config import settings


def seed_super_admin(db: Session):
    """Create the super admin account if it doesn't exist."""
    existing = db.query(SuperAdmin).filter(
        SuperAdmin.email == settings.SUPER_ADMIN_EMAIL
    ).first()

    if existing:
        return

    admin = SuperAdmin(
        email=settings.SUPER_ADMIN_EMAIL,
        password_hash=hash_password(settings.SUPER_ADMIN_PASSWORD),
        name="Super Admin",
        is_active=True
    )
    db.add(admin)
    db.commit()
    print(f"[SEED] Super admin created: {settings.SUPER_ADMIN_EMAIL}")

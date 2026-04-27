# FitNexus — Multi-Tenant Gym Management Platform

## Quick Start (Docker)

```bash
# 1. Clone and enter project
cd gym-saas

# 2. Copy env file and fill in your keys
cp .env.example .env

# 3. Add your firebase-credentials.json to root
# (Download from Firebase Console > Project Settings > Service Accounts)

# 4. Start everything
docker-compose up --build

# API is live at:
#   http://localhost:8000
#   http://localhost:8000/docs  ← Swagger UI (test all APIs here)
```

---

## Default Super Admin Login
```
Email:    admin@gymsaas.com     (set in .env)
Password: SuperAdmin@123        (set in .env)
```

---

## API Structure

| Prefix | Who uses it |
|--------|-------------|
| `/api/v1/auth/...` | All roles — login + OTP |
| `/api/v1/super-admin/...` | Super Admin only |
| `/api/v1/gym/...` | Gym owner + receptionist |
| `/api/v1/attendance/...` | Staff + members |
| `/api/v1/notifications/...` | Staff + members |
| `/api/v1/member/...` | Members (Flutter app) |

---

## Key API Endpoints

### Auth
- `POST /api/v1/auth/super-admin/login`
- `POST /api/v1/auth/gym/login`
- `POST /api/v1/auth/member/request-otp`
- `POST /api/v1/auth/member/verify-otp`

### Super Admin
- `POST /api/v1/super-admin/gyms` — Create gym + subscription + owner
- `GET  /api/v1/super-admin/gyms` — List all gyms
- `PUT  /api/v1/super-admin/gyms/{id}/subscription` — Renew subscription
- `PATCH /api/v1/super-admin/gyms/{id}/toggle-access` — Enable/disable
- `GET  /api/v1/super-admin/dashboard` — Platform stats
- `GET  /api/v1/super-admin/revenue` — Revenue report

### Gym Admin
- `POST /api/v1/gym/members` — Add member
- `GET  /api/v1/gym/members` — List members
- `POST /api/v1/gym/payments` — Record payment
- `GET  /api/v1/gym/payments/{id}/receipt` — Download PDF receipt
- `POST /api/v1/gym/workout-plans` — Create workout plan
- `POST /api/v1/gym/workout-plans/assign` — Assign to member
- `POST /api/v1/gym/diet-plans` — Create diet plan
- `POST /api/v1/gym/staff` — Add receptionist

### Attendance
- `GET  /api/v1/attendance/qr-code` — Get gym QR as PNG
- `GET  /api/v1/attendance/qr-token` — Get QR token for Flutter
- `POST /api/v1/attendance/scan` — Member scans QR
- `GET  /api/v1/attendance/today` — Today's check-ins
- `GET  /api/v1/attendance/my-history` — Member's own history

### Member App
- `GET  /api/v1/member/dashboard`
- `GET  /api/v1/member/workout`
- `GET  /api/v1/member/diet`
- `GET  /api/v1/member/payments`
- `GET  /api/v1/member/profile`

### Notifications
- `POST /api/v1/notifications/bulk` — Bulk SMS/WhatsApp/push
- `POST /api/v1/notifications/send` — Single member
- `POST /api/v1/notifications/update-fcm-token` — Flutter saves token

---

## Dev Mode

When `TWO_FACTOR_API_KEY` is blank in `.env`:
- OTP is printed to console, accepted as `123456`
- SMS/WhatsApp logged to console, not sent

When `FIREBASE_CREDENTIALS_PATH` file doesn't exist:
- Push notifications are skipped silently

---

## Project Structure
```
app/
├── main.py                  # FastAPI app + router registration
├── database.py              # DB connection
├── core/
│   ├── config.py            # Settings from .env
│   └── security.py          # JWT + role dependencies
├── models/
│   └── models.py            # All SQLAlchemy tables
├── schemas/
│   ├── gym_schemas.py       # Super admin schemas
│   └── gym_admin_schemas.py # Gym admin schemas
├── routers/
│   ├── auth.py              # Login + OTP
│   ├── super_admin.py       # Gym & subscription mgmt
│   ├── gym_admin.py         # Members, payments, plans
│   ├── attendance.py        # QR + check-in
│   ├── notifications.py     # Bulk + single notify
│   └── member_app.py        # Flutter app endpoints
└── services/
    ├── otp_service.py       # 2Factor.in
    ├── notification_service.py  # SMS + WhatsApp + FCM
    ├── qr_service.py        # QR generation
    ├── receipt_service.py   # PDF receipt
    ├── scheduler.py         # Daily expiry + reminder jobs
    └── seeder.py            # Super admin seed
```

---

## Next Step: Flutter App
The Flutter app connects to this backend.
All member endpoints require Bearer token from OTP login.

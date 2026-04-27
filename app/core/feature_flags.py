# ─────────────────────────────────────────────
# PLAN FEATURE MATRIX
# Single source of truth — controls what each
# subscription plan can access on both admin
# panel and member app.
#
# Only two plans: Basic and Pro.
# Pro = all features unlocked.
# ─────────────────────────────────────────────

PLAN_FEATURES = {
    "basic": {
        # ── Admin Panel features ──
        "max_members": 50,
        "max_staff": 2,
        "dashboard": True,
        "member_management": True,
        "attendance": True,
        "payments": True,
        "qr_checkin": True,
        "membership_plans": True,
        "workout_plans": False,          # Pro only
        "diet_plans": False,             # Pro only
        "body_measurements": False,      # Pro only
        "notifications_sms": False,      # Pro only
        "notifications_push": True,
        "announcements": True,
        "reports_basic": True,
        "reports_advanced": False,       # Pro only
        "staff_management": False,       # Pro only

        # ── Member App features ──
        # When gym is on Basic, members ALSO cannot see these
        "member_workout_view": False,
        "member_diet_view": False,
        "member_measurements_chart": False,
        "member_bmi_calculator": True,
        "member_attendance_calendar": True,
        "member_receipt_download": True,
        "member_receipt_share": False,   # Pro only
        "member_announcements": True,
    },
    "pro": {
        # ── Admin Panel features ── ALL UNLOCKED
        "max_members": -1,       # unlimited
        "max_staff": -1,         # unlimited
        "dashboard": True,
        "member_management": True,
        "attendance": True,
        "payments": True,
        "qr_checkin": True,
        "membership_plans": True,
        "workout_plans": True,
        "diet_plans": True,
        "body_measurements": True,
        "notifications_sms": True,
        "notifications_push": True,
        "announcements": True,
        "reports_basic": True,
        "reports_advanced": True,
        "staff_management": True,

        # ── Member App features ── ALL UNLOCKED
        "member_workout_view": True,
        "member_diet_view": True,
        "member_measurements_chart": True,
        "member_bmi_calculator": True,
        "member_attendance_calendar": True,
        "member_receipt_download": True,
        "member_receipt_share": True,
        "member_announcements": True,
    },
}

# Feature display names for UI labels / upgrade prompts
FEATURE_LABELS = {
    "workout_plans": "Workout Plans",
    "diet_plans": "Diet Plans",
    "body_measurements": "Body Measurements",
    "notifications_sms": "SMS Notifications",
    "reports_advanced": "Advanced Reports",
    "staff_management": "Staff Management",
    "member_workout_view": "Workout Plans",
    "member_diet_view": "Diet Plans",
    "member_measurements_chart": "Body Progress Charts",
    "member_receipt_share": "Share Receipts",
}

# Every locked feature points to "pro" (only upgrade path)
UPGRADE_PLAN = {
    "workout_plans": "pro",
    "diet_plans": "pro",
    "body_measurements": "pro",
    "notifications_sms": "pro",
    "reports_advanced": "pro",
    "staff_management": "pro",
    "member_workout_view": "pro",
    "member_diet_view": "pro",
    "member_measurements_chart": "pro",
    "member_receipt_share": "pro",
}


def get_plan_features(plan_name: str) -> dict:
    """Get feature dict for a plan. Falls back to basic."""
    return PLAN_FEATURES.get(plan_name, PLAN_FEATURES["basic"])


def check_feature(plan_name: str, feature_key: str) -> bool:
    """Check if a specific feature is enabled for a plan."""
    features = get_plan_features(plan_name)
    return features.get(feature_key, False)

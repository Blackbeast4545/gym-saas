import httpx
from app.core.config import settings

TWO_FACTOR_BASE = "https://2factor.in/API/V1"


def send_otp(phone: str) -> dict:
    """Send OTP via 2Factor.in"""
    if not settings.TWO_FACTOR_API_KEY:
        # Dev mode: print OTP to console
        print(f"[DEV MODE] OTP for {phone}: 123456")
        return {"success": True, "session_id": "dev_session"}

    url = f"{TWO_FACTOR_BASE}/{settings.TWO_FACTOR_API_KEY}/SMS/{phone}/AUTOGEN"
    try:
        resp = httpx.get(url, timeout=10)
        data = resp.json()
        if data.get("Status") == "Success":
            return {"success": True, "session_id": data.get("Details")}
        return {"success": False, "error": data.get("Details")}
    except Exception as e:
        return {"success": False, "error": str(e)}


def verify_otp(phone: str, otp: str) -> bool:
    """Verify OTP via 2Factor.in"""
    if not settings.TWO_FACTOR_API_KEY:
        # Dev mode: accept 123456
        return otp == "123456"

    url = f"{TWO_FACTOR_BASE}/{settings.TWO_FACTOR_API_KEY}/SMS/VERIFY3/{phone}/{otp}"
    try:
        resp = httpx.get(url, timeout=10)
        data = resp.json()
        return data.get("Status") == "Success"
    except Exception:
        return False


def send_sms(phone: str, message: str) -> dict:
    """Send plain SMS via 2Factor.in"""
    if not settings.TWO_FACTOR_API_KEY:
        print(f"[DEV SMS] To {phone}: {message}")
        return {"success": True}

    url = f"{TWO_FACTOR_BASE}/{settings.TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS"
    try:
        resp = httpx.post(url, json={
            "From": settings.TWO_FACTOR_SENDER_ID,
            "To": phone,
            "Msg": message,
        }, timeout=10)
        data = resp.json()
        return {"success": data.get("Status") == "Success", "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}


def send_whatsapp(phone: str, message: str) -> dict:
    """Send WhatsApp message via 2Factor.in"""
    if not settings.TWO_FACTOR_API_KEY:
        print(f"[DEV WHATSAPP] To {phone}: {message}")
        return {"success": True}

    url = f"{TWO_FACTOR_BASE}/{settings.TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/WHATSAPP"
    try:
        resp = httpx.post(url, json={
            "To": phone,
            "Msg": message,
        }, timeout=10)
        data = resp.json()
        return {"success": data.get("Status") == "Success", "data": data}
    except Exception as e:
        return {"success": False, "error": str(e)}

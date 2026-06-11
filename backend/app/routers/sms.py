from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import requests
import os
import json
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
router = APIRouter()

FAST2SMS_API_KEY = os.getenv("FAST2SMS_API_KEY", "")

# In-memory store for subscriptions (replace with DB later)
subscriptions = []


class SMSSubscribeRequest(BaseModel):
    phone: str
    country_code: str = "+91"


class SMSAlertRequest(BaseModel):
    phone: str
    message: str


def send_sms_fast2sms(phone: str, message: str) -> dict:
    """Send SMS via Fast2SMS API"""
    
    # Strip country code if present
    clean_phone = phone.replace("+91", "").replace(" ", "").strip()
    
    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": FAST2SMS_API_KEY,
        "Content-Type": "application/json"
    }
    payload = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": clean_phone
    }
    
    response = requests.post(url, json=payload, headers=headers, timeout=10)
    return response.json()


@router.options("/subscribe")
async def sms_subscribe_options():
    return JSONResponse(content={}, status_code=200)


@router.post("/subscribe")
async def subscribe_sms(request: SMSSubscribeRequest):
    if not FAST2SMS_API_KEY:
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": "SMS service not configured. Add FAST2SMS_API_KEY to .env"
        })

    phone = request.phone.strip()
    if not phone or len(phone) < 10:
        return JSONResponse(status_code=400, content={
            "success": False,
            "message": "Invalid phone number. Must be 10 digits."
        })

    # Check for duplicate subscription
    existing = [s for s in subscriptions if s["phone"] == phone]
    if existing:
        return JSONResponse(status_code=200, content={
            "success": True,
            "message": f"You are already subscribed to RailSense AI alerts."
        })

    # Send welcome SMS
    welcome_msg = (
        f"Welcome to RailSense AI Alerts! "
        f"You will now receive real-time train delay predictions "
        f"and platform alerts for Indian Railways. "
        f"Reply STOP to unsubscribe."
    )

    try:
        sms_result = send_sms_fast2sms(phone, welcome_msg)
        
        if sms_result.get("return") == True:
            # Save subscription
            subscriptions.append({
                "phone": phone,
                "country_code": request.country_code,
                "subscribed_at": datetime.now().isoformat(),
                "active": True
            })
            return {
                "success": True,
                "message": (
                    f"Successfully subscribed! "
                    f"A welcome SMS has been sent to "
                    f"{request.country_code} {phone[-4:].zfill(len(phone))}"
                ),
                "subscribed_at": datetime.now().isoformat()
            }
        else:
            error_msg = sms_result.get("message", ["SMS delivery failed"])
            return JSONResponse(status_code=502, content={
                "success": False,
                "message": f"SMS failed: {error_msg[0] if isinstance(error_msg, list) else error_msg}"
            })

    except requests.Timeout:
        return JSONResponse(status_code=504, content={
            "success": False,
            "message": "SMS service timed out. Please try again."
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": f"Subscription failed: {str(e)}"
        })


@router.post("/send-alert")
async def send_alert(request: SMSAlertRequest):
    """Send a custom alert SMS — called internally by other modules"""
    if not FAST2SMS_API_KEY:
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": "SMS service not configured"
        })
    try:
        result = send_sms_fast2sms(request.phone, request.message)
        return {
            "success": result.get("return") == True,
            "result": result
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "success": False,
            "message": str(e)
        })


@router.get("/subscriptions")
async def get_subscriptions():
    """List all active subscriptions"""
    return {
        "total": len(subscriptions),
        "subscriptions": subscriptions
    }


@router.delete("/unsubscribe/{phone}")
async def unsubscribe(phone: str):
    global subscriptions
    before = len(subscriptions)
    subscriptions = [s for s in subscriptions if s["phone"] != phone]
    removed = before - len(subscriptions)
    return {
        "success": removed > 0,
        "message": "Unsubscribed successfully" if removed > 0 else "Phone not found"
    }

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import uuid

router = APIRouter(prefix="/api/sms", tags=["SMS Subscription"])

class SubscriptionRequest(BaseModel):
    phone_number: str
    train_number: str
    language: str = "en"

class SubscriptionResponse(BaseModel):
    subscription_id: str
    status: str
    message: str

@router.post("/subscribe", response_model=SubscriptionResponse)
async def subscribe_sms(req: SubscriptionRequest):
    if len(req.phone_number) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Mock SMS subscription logic
    print(f"✅ [SMS Mock] Subscribed {req.phone_number} to alerts for Train {req.train_number} in {req.language.upper()}")
    
    return SubscriptionResponse(
        subscription_id=str(uuid.uuid4()),
        status="success",
        message=f"Successfully subscribed {req.phone_number} to alerts."
    )

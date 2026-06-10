import logging
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from app.config import settings

logger = logging.getLogger(__name__)

def send_delay_alert(target_phone_number: str, train_number: str, delay_time_minutes: int) -> bool:
    """
    Dispatches a live SMS alert using Twilio.
    Falls back to a simulated log if credentials fail.
    """
    message_body = f"Alert: Train {train_number} is delayed by {delay_time_minutes} minutes. Track live status on RailSense AI."
    
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_PHONE_NUMBER:
        logger.warning("Twilio credentials not fully configured. Simulating SMS.")
        print(f"[SIMULATED SMS to {target_phone_number}]: {message_body}")
        return False

    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        message = client.messages.create(
            body=message_body,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=target_phone_number
        )
        logger.info(f"SMS successfully dispatched. SID: {message.sid}")
        return True
    except TwilioRestException as e:
        logger.error(f"Twilio API Error: {e}. Simulating SMS.")
        print(f"[SIMULATED SMS to {target_phone_number}]: {message_body}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error dispatching SMS: {e}. Simulating SMS.")
        print(f"[SIMULATED SMS to {target_phone_number}]: {message_body}")
        return False

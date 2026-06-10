from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Core
    CORS_ORIGIN: str = "http://localhost:5173"
    SECRET_KEY: str = "changeme"

    # OpenWeather
    OPENWEATHER_API_KEY: str = ""

    # Twilio SMS
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # NTES / IRCTC
    IRCTC_API_KEY: Optional[str] = None
    NTES_BRIDGE_URL: str = "http://localhost:3001"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

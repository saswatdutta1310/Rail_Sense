from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Core
    CORS_ORIGIN: str = "http://localhost:5173"
    FRONTEND_URL: str = "http://localhost:5173"
    SECRET_KEY: str = "changeme"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 480
    JWT_REFRESH_EXPIRY_DAYS: int = 30

    # OpenWeather
    OPENWEATHER_API_KEY: str = ""
    OPENWEATHER_API_URL: str = "https://api.openweathermap.org/data/2.5"

    # Anthropic
    anthropic_api_key: str = ""

    # Gemini
    gemini_api_key: str = ""

    # Twilio SMS
    fast2sms_api_key: str = ""
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_PHONE_NUMBER: Optional[str] = None

    # MSG91 SMS (India)
    MSG91_AUTH_KEY: Optional[str] = None
    MSG91_API_URL: str = "https://api.msg91.com/api"

    # NTES / IRCTC
    IRCTC_API_KEY: Optional[str] = None
    NTES_API_KEY: Optional[str] = None
    NTES_BRIDGE_URL: str = "http://localhost:3001"
    NTES_API_URL: str = "https://api.ntes.railway.gov.in"

    # Redis & Celery
    REDIS_URL: str = "redis://localhost:6379/0"
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: Optional[str] = None
    CLOUDINARY_API_KEY: Optional[str] = None
    CLOUDINARY_API_SECRET: Optional[str] = None

    # AWS S3
    AWS_REGION: str = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: str = "railsense-uploads"

    # ML Models
    DELAY_MODEL_PATH: str = "./models/delay_xgboost_v1.pkl"
    YOLOv5_WEIGHTS_PATH: str = "./models/yolov5s.pt"
    VISION_TRANSFORMER_PATH: str = "./models/vit-base-patch16-224.bin"

    # Rate Limiting
    RATE_LIMIT_PUBLIC: int = 100
    RATE_LIMIT_AUTHENTICATED: int = 500

    # Logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

settings = Settings()

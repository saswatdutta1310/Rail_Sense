from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from .models import AlertLevelEnum, PriorityLevelEnum, RoleEnum


# ============ Authentication ============
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=255)
    role: Optional[RoleEnum] = RoleEnum.public
    station_id: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    station_id: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: EmailStr
    full_name: str
    role: RoleEnum
    station_id: Optional[str]
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int


class TokenRefresh(BaseModel):
    refresh_token: str


# ============ Station ============
class StationBase(BaseModel):
    station_code: str
    station_name: str
    city: str
    state: str
    latitude: float
    longitude: float
    platform_count: int = 1
    has_cctv: bool = False
    zone: str


class StationOut(StationBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


# ============ Train ============
class TrainBase(BaseModel):
    train_number: str
    train_name: str
    origin_station_id: str
    destination_station_id: str
    train_type: str
    typical_duration_min: int
    is_active: bool = True
    name_translations: Optional[Dict[str, str]] = None


class TrainOut(TrainBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    updated_at: datetime


class TrainSearch(BaseModel):
    q: str  # Search query (train name or number)
    lang: str = "en"  # Language code


# ============ Delay Prediction ============
class DelayPredictionCreate(BaseModel):
    train_id: str
    predicted_delay_min: int
    confidence_pct: float
    root_causes: List[str]
    weather_input: Dict[str, Any]
    signal_status: str
    congestion_level: float
    model_version: str


class DelayPredictionOut(DelayPredictionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    predicted_at: datetime
    requested_by_ip: Optional[str]
    created_at: datetime


class DelayPredictionResponse(BaseModel):
    train_number: str
    train_name: str
    predicted_delay_min: int
    confidence_pct: float
    root_causes: List[str]
    signal_status: str
    congestion_level: float


class CascadeImpact(BaseModel):
    train_no: str
    train_name: str
    propagated_delay_min: int
    position: int
    impact_level: str  # "low" | "medium" | "high"


# ============ Platform Analysis ============
class PlatformAnalysisCreate(BaseModel):
    station_id: str
    platform_number: int
    image_url: str
    alert_level: AlertLevelEnum
    crowd_density: float
    fall_detected: bool
    person_count: int
    detection_metadata: Dict[str, Any]
    model_version: str


class PlatformAnalysisOut(PlatformAnalysisCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    operator_id: Optional[str]
    analyzed_at: datetime
    created_at: datetime


# ============ Track Analysis ============
class TrackAnalysisCreate(BaseModel):
    image_url: str
    track_segment_ref: Optional[str] = None
    annotated_image_url: Optional[str] = None
    risk_score: float
    priority_level: PriorityLevelEnum
    defect_count: int
    defects: List[Dict[str, Any]]
    model_version: str


class TrackAnalysisOut(TrackAnalysisCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    engineer_id: Optional[str]
    analyzed_at: datetime
    created_at: datetime


# ============ SMS Subscription ============
class SmsSubscriptionCreate(BaseModel):
    phone_number: str  # E.164 format
    train_id: str
    language_code: str = "en"


class SmsSubscriptionOut(SmsSubscriptionCreate):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_active: bool
    subscribed_at: datetime
    last_alerted_at: Optional[datetime]
    created_at: datetime


# ============ Impact Dashboard ============
class ImpactMetrics(BaseModel):
    stations_deployed: int
    track_km_monitored: int
    avg_delay_saved_min: int
    passenger_hours_saved_day: int
    annual_fuel_savings_cr: float
    animal_lives_saved_yr: int
    incidents_prevented_yr: int


# ============ Health Check ============
class HealthCheck(BaseModel):
    status: str
    version: str = "1.0.0"
    database: str = "ok"
    redis: str = "ok"

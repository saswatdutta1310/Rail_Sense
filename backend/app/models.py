from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime, Float, Enum, JSON
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime
from .database import Base

class RoleEnum(str, enum.Enum):
    public = "public"
    operator = "operator"
    admin = "admin"
    superadmin = "superadmin"

class AlertLevelEnum(str, enum.Enum):
    green = "green"
    yellow = "yellow"
    red = "red"
    critical = "critical"

class PriorityLevelEnum(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.public)
    station_id = Column(String, ForeignKey("stations.id"), nullable=True)
    full_name = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    station = relationship("Station")

class Station(Base):
    __tablename__ = "stations"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    station_code = Column(String(8), unique=True, nullable=False)
    station_name = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    platform_count = Column(Integer, default=1)
    has_cctv = Column(Boolean, default=False)
    zone = Column(String(10), nullable=False)

class Train(Base):
    __tablename__ = "trains"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    train_number = Column(String(10), unique=True, nullable=False)
    train_name = Column(String(255), nullable=False)
    name_translations = Column(JSON, nullable=True)
    origin_station_id = Column(String, ForeignKey("stations.id"))
    destination_station_id = Column(String, ForeignKey("stations.id"))
    train_type = Column(String(50), nullable=False)
    typical_duration_min = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    origin_station = relationship("Station", foreign_keys=[origin_station_id])
    destination_station = relationship("Station", foreign_keys=[destination_station_id])

class DelayPrediction(Base):
    __tablename__ = "delay_predictions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    train_id = Column(String, ForeignKey("trains.id"), nullable=False)
    predicted_delay_min = Column(Integer, nullable=False)
    confidence_pct = Column(Float, nullable=False)
    root_causes = Column(JSON, nullable=False)
    weather_input = Column(JSON, nullable=False)
    signal_status = Column(String(20), nullable=False)
    congestion_level = Column(Float, nullable=False)
    model_version = Column(String(20), nullable=False)
    predicted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    requested_by_ip = Column(String, nullable=True)

    train = relationship("Train")

class PlatformAnalysis(Base):
    __tablename__ = "platform_analyses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    station_id = Column(String, ForeignKey("stations.id"), nullable=False)
    platform_number = Column(Integer, nullable=False)
    operator_id = Column(String, ForeignKey("users.id"), nullable=True)
    image_url = Column(String(500), nullable=False)
    alert_level = Column(Enum(AlertLevelEnum), nullable=False)
    crowd_density = Column(Float, nullable=False)
    fall_detected = Column(Boolean, default=False)
    person_count = Column(Integer, nullable=False)
    detection_metadata = Column(JSON, nullable=False)
    model_version = Column(String(20), nullable=False)
    analyzed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    station = relationship("Station")
    operator = relationship("User")

class TrackAnalysis(Base):
    __tablename__ = "track_analyses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    engineer_id = Column(String, ForeignKey("users.id"), nullable=True)
    track_segment_ref = Column(String(100), nullable=True)
    image_url = Column(String(500), nullable=False)
    annotated_image_url = Column(String(500), nullable=True)
    risk_score = Column(Float, nullable=False)
    priority_level = Column(Enum(PriorityLevelEnum), nullable=False)
    defect_count = Column(Integer, nullable=False, default=0)
    defects = Column(JSON, nullable=False)
    model_version = Column(String(20), nullable=False)
    analyzed_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    engineer = relationship("User")

class SmsSubscription(Base):
    __tablename__ = "sms_subscriptions"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone_number = Column(String(15), nullable=False)
    train_id = Column(String, ForeignKey("trains.id"), nullable=False)
    language_code = Column(String(5), default="en")
    is_active = Column(Boolean, default=True)
    subscribed_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_alerted_at = Column(DateTime(timezone=True), nullable=True)

    train = relationship("Train")

"""
Delay Prediction API Endpoints

Endpoints:
  GET  /api/delay/cascade/{train_no}  — propagated delay for downstream trains
  POST /api/delay/{train_no}          — predict delay for a given train number
"""

from __future__ import annotations

import logging
import os
import random
from datetime import datetime, timezone
from typing import List, Optional

import joblib
import numpy as np
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from .. import database
from ..auth import get_current_user
from ..models import DelayPrediction, Train, User
from ..services.ntes import get_live_train_status
from ..services.weather import WeatherData, get_live_weather

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------
router = APIRouter(prefix="/api/delay", tags=["Delay Predictor"])

# ---------------------------------------------------------------------------
# Model singleton — loaded once at module import time
# ---------------------------------------------------------------------------
_MODEL_PATH = os.path.normpath(
    os.path.join(os.path.dirname(__file__), "..", "..", "models", "delay_v1.pkl")
)
_MODEL_VERSION = "1.0.0"

try:
    _model = joblib.load(_MODEL_PATH)
    logger.info("XGBoost delay model loaded from %s", _MODEL_PATH)
except Exception as _exc:
    _model = None
    logger.warning(
        "Could not load XGBoost model (%s): %s — fallback mode active.",
        _MODEL_PATH,
        _exc,
    )

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class NtesData(BaseModel):
    train_no: str
    current_station: str
    lat: float
    lon: float
    data_source: str = "mock"  # "live" | "mock"


class WeatherInfo(BaseModel):
    fog_index: float
    rainfall_mm: float
    condition: str


class DelayResult(BaseModel):
    train_number: str
    predicted_delay_min: int
    confidence_pct: float
    root_causes: List[str]
    ntes_data: Optional[NtesData] = None
    weather_data: Optional[WeatherInfo] = None
    data_source: str = "mock"  # mirrors ntes_data.data_source


class DelayRequest(BaseModel):
    signal_status: str = "normal"  # normal | degraded | failed
    congestion_level: float = 0.5  # 0.0–1.0


class CascadeTrainResult(BaseModel):
    train_no: str
    train_name: str
    propagated_delay_min: int
    position: int
    impact_level: str  # "low" | "medium" | "high"


# ---------------------------------------------------------------------------
# Cascade route data
# ---------------------------------------------------------------------------
_PROPAGATION_FACTORS: List[float] = [0.85, 0.70, 0.55, 0.40, 0.25]

_CASCADE_ROUTES: dict[str, List[tuple[str, str]]] = {
    "12627": [
        ("12628", "Karnataka Express"),
        ("16535", "Gol Gumbaz Express"),
        ("11013", "Coimbatore Express"),
        ("12779", "Goa Express"),
        ("16589", "Rani Chennamma"),
    ],
    "12301": [
        ("12302", "Howrah Rajdhani"),
        ("12381", "Poorva Express"),
        ("13005", "Amritsar Mail"),
        ("12311", "Kalka Mail"),
        ("12335", "Bgp Ltt Express"),
    ],
    "12951": [
        ("12952", "Mumbai Rajdhani"),
        ("12009", "Shatabdi Express"),
        ("12015", "Ajmer Shatabdi"),
        ("12955", "Jaipur SF"),
        ("12957", "Swarna Jayanti"),
    ],
    "12621": [
        ("12622", "Tamil Nadu Express"),
        ("12163", "Chennai Egmore"),
        ("12605", "Pallavan Express"),
        ("12635", "Vaigai Express"),
        ("12673", "Cheran Express"),
    ],
    "11301": [
        ("11302", "Udyan Express"),
        ("11007", "Deccan Express"),
        ("11009", "Sinhagad Express"),
        ("12123", "Deccan Queen"),
        ("12127", "Intercity"),
    ],
}


def _get_impact_level(delay_min: int) -> str:
    if delay_min < 10:
        return "low"
    elif delay_min <= 30:
        return "medium"
    return "high"


# ---------------------------------------------------------------------------
# Feature engineering helpers
# ---------------------------------------------------------------------------
_SIGNAL_MAP = {"normal": 0, "degraded": 1, "failed": 2}


def _derive_fog_index(weather_data: WeatherData) -> float:
    """
    Re-map WeatherData.fog_index through visibility bands for consistent
    ML feature encoding.

    Bands (approximate visibility in metres):
        < 200  -> 1.0  (dense fog)
        < 1000 -> 0.6  (thick fog)
        < 5000 -> 0.3  (moderate mist)
        else   -> 0.0  (clear)
    """
    fi = weather_data.fog_index
    visibility_m = (1.0 - fi) * 10_000

    if visibility_m < 200:
        return 1.0
    elif visibility_m < 1_000:
        return 0.6
    elif visibility_m < 5_000:
        return 0.3
    return 0.0


def _encode_train_type(train_no: str) -> int:
    """
    Derive train category from number prefix.
        12xxx -> 2 (Rajdhani / premium)
        1xxxx -> 1 (Express)
        else  -> 0 (Passenger / other)
    """
    tn = train_no.strip()
    if tn.startswith("12"):
        return 2
    elif tn.startswith("1") and len(tn) == 5:
        return 1
    return 0


def build_feature_vector(
    weather_data: WeatherData,
    train_no: str = "00000",
    signal_status: str = "normal",
    congestion_level: float = 0.5,
) -> np.ndarray:
    """
    Build the 6-element feature vector expected by delay_v1.pkl.

    Feature order: fog_index, rainfall_mm, signal_status,
                   congestion_level, time_of_day, train_type
    """
    fog_index = _derive_fog_index(weather_data)
    rainfall_mm = float(weather_data.rainfall_mm)
    signal_int = _SIGNAL_MAP.get(signal_status.lower(), 0)
    congestion = float(max(0.0, min(1.0, congestion_level)))
    time_of_day = datetime.now(timezone.utc).hour
    train_type = _encode_train_type(train_no)

    vector = np.array(
        [[fog_index, rainfall_mm, signal_int, congestion, time_of_day, train_type]],
        dtype=np.float64,
    )
    logger.debug(
        "Feature vector: fog=%.2f rain=%.1f sig=%d cong=%.2f tod=%d type=%d",
        fog_index,
        rainfall_mm,
        signal_int,
        congestion,
        time_of_day,
        train_type,
    )
    return vector


# ---------------------------------------------------------------------------
# Prediction helpers
# ---------------------------------------------------------------------------


def _fallback_delay(
    fog_index: float,
    rainfall_mm: float,
    signal_status: str,
    congestion_level: float,
) -> int:
    """Rule-based fallback when the model file is unavailable."""
    base = 0.0
    base += fog_index * 80.0
    base += (rainfall_mm / 50.0) * 25.0
    base += congestion_level * 20.0
    if signal_status == "failed":
        base += 75.0
    elif signal_status == "degraded":
        base += 25.0
    base += random.uniform(-2, 5)
    return int(max(0, min(240, round(base))))


async def _predict_delay_for_train(train_no: str) -> int:
    """
    Async helper used by the cascade endpoint.
    Calls the NTES + weather + model pipeline.
    Falls back to 25 min if any external call fails.
    """
    try:
        train_status = await get_live_train_status(train_no)
        lat = train_status.current_location.latitude
        lon = train_status.current_location.longitude
        weather_data = await get_live_weather(lat, lon)
        fv = build_feature_vector(weather_data, train_no=train_no)
        if _model is not None:
            return max(0, min(240, int(_model.predict(fv)[0])))
        return _fallback_delay(
            float(fv[0, 0]), float(fv[0, 1]), "normal", float(fv[0, 3])
        )
    except Exception as exc:
        logger.warning(
            "_predict_delay_for_train(%s) failed: %s — using fallback 25", train_no, exc
        )
        return 25


def _compute_confidence(predicted_delay: int) -> float:
    """95% at baseline ~15 min, decays 0.5 pp per minute of deviation. Clamped [50, 95]."""
    return round(min(95.0, max(50.0, 95.0 - abs(predicted_delay - 15) * 0.5)), 1)


# ---------------------------------------------------------------------------
# Endpoints  (cascade GET registered BEFORE the wildcard POST /{train_no})
# ---------------------------------------------------------------------------


@router.get("/cascade/{train_no}", response_model=List[CascadeTrainResult])
async def get_cascade_impact(train_no: str):
    """
    Returns propagated delay for each downstream train on the same route.
    Returns an empty list (not 404) when train_no is not in the routes dict.

    Propagation factors by position:
        1 -> ×0.85   2 -> ×0.70   3 -> ×0.55   4 -> ×0.40   5 -> ×0.25
    """
    downstream = _CASCADE_ROUTES.get(train_no, [])
    if not downstream:
        return []

    base_delay = await _predict_delay_for_train(train_no)

    results: List[CascadeTrainResult] = []
    for i, (dn_train_no, dn_train_name) in enumerate(downstream):
        prop_delay = max(0, min(240, int(base_delay * _PROPAGATION_FACTORS[i])))
        results.append(
            CascadeTrainResult(
                train_no=dn_train_no,
                train_name=dn_train_name,
                propagated_delay_min=prop_delay,
                position=i + 1,
                impact_level=_get_impact_level(prop_delay),
            )
        )

    logger.info(
        "Cascade for %s: base=%d min, %d trains affected",
        train_no,
        base_delay,
        len(results),
    )
    return results


@router.post("/{train_no}", response_model=DelayResult)
async def get_delay_prediction(
    train_no: str,
    request: DelayRequest,
    db: AsyncSession = Depends(database.get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Predict delay for a given train number.

    - Fetches live location via NTES service
    - Fetches live weather via OpenWeather API
    - Builds 6-feature vector and runs XGBoost inference
    - Persists prediction record to DB (if train found)
    """
    if len(train_no) < 4:
        raise HTTPException(
            status_code=400, detail="Invalid train number — must be at least 4 digits."
        )

    # Live data
    train_status = await get_live_train_status(train_no)
    lat = train_status.current_location.latitude
    lon = train_status.current_location.longitude
    weather_data = await get_live_weather(lat, lon)

    # Feature vector
    feature_vector = build_feature_vector(
        weather_data=weather_data,
        train_no=train_no,
        signal_status=request.signal_status,
        congestion_level=request.congestion_level,
    )

    fog_index = float(feature_vector[0, 0])
    rainfall_mm = float(feature_vector[0, 1])
    congestion_level = float(feature_vector[0, 3])

    # Model inference
    if _model is not None:
        predicted_delay = max(0, min(240, int(_model.predict(feature_vector)[0])))
    else:
        logger.warning("Model unavailable — rule-based fallback for train %s", train_no)
        predicted_delay = _fallback_delay(
            fog_index, rainfall_mm, request.signal_status, congestion_level
        )

    confidence_pct = _compute_confidence(predicted_delay)

    # Root cause tagging
    root_causes: List[str] = []
    if fog_index > 0.3:
        root_causes.append("FOG")
    if rainfall_mm > 5:
        root_causes.append("RAIN")
    if request.signal_status != "normal":
        root_causes.append("SIGNAL")
    if congestion_level > 0.6:
        root_causes.append("CONGESTION")
    if datetime.now(timezone.utc).hour in [7, 8, 9, 17, 18, 19]:
        root_causes.append("PEAK HOURS")
    if not root_causes:
        if predicted_delay > 30:
            root_causes.append("ROUTE CONGESTION")
        elif predicted_delay > 10:
            root_causes.append("MINOR DELAY")
        else:
            root_causes.append("ON TIME")

    # DB persistence
    result = await db.execute(select(Train).where(Train.train_number == train_no))
    train = result.scalars().first()

    if train:
        db.add(
            DelayPrediction(
                train_id=train.id,
                predicted_delay_min=predicted_delay,
                confidence_pct=confidence_pct,
                root_causes=root_causes,
                weather_input={
                    "fog_index": fog_index,
                    "rainfall_mm": rainfall_mm,
                    "condition": weather_data.condition,
                },
                signal_status=request.signal_status,
                congestion_level=round(congestion_level, 4),
                model_version=_MODEL_VERSION,
                requested_by_ip=str(current_user.id),
            )
        )
        await db.commit()

    return DelayResult(
        train_number=train_no,
        predicted_delay_min=predicted_delay,
        confidence_pct=confidence_pct,
        root_causes=root_causes,
        data_source=train_status.data_source,
        ntes_data=NtesData(
            train_no=train_no,
            current_station=train_status.last_reported_station,
            lat=lat,
            lon=lon,
            data_source=train_status.data_source,
        ),
        weather_data=WeatherInfo(
            fog_index=fog_index,
            rainfall_mm=rainfall_mm,
            condition=weather_data.condition,
        ),
    )

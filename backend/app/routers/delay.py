"""
Delay Prediction API Endpoints

Provides ML-powered train delay predictions with root cause analysis
and cascade impact calculation.

Endpoints:
- POST /api/delay/predict - Get delay prediction for a train
- GET /api/delay/predictions/{train_id} - Get recent predictions
- GET /api/delay/stats - Get prediction statistics
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
import numpy as np
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
import os
import uuid

import joblib
from pydantic import BaseModel

from .. import database, models, schemas, auth
from ..config import settings
from ..services.ntes import get_live_train_status
from ..services.weather import WeatherData, get_live_weather

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/delay", tags=["Delay Prediction"])

# Load trained model (optional - can work without ML model)
try:
    from ..ml.train_delay_model import DelayPredictionModel
    model = DelayPredictionModel(model_dir="backend/ml/models")
    model.load("delay_model_v1")
    logger.info("✅ Delay prediction model loaded successfully")
except Exception as e:
    logger.warning(f"⚠️  Delay model not available: {e}. Using fallback predictions.")
    model = None


class CascadeImpactCalculator:
    """Calculate cascade delay impacts on connected trains"""
    
    def __init__(self, db_session: AsyncSession):
        self.db = db_session
    
    async def calculate(
        self,
        affected_train_id: str,
        delay_minutes: int
    ) -> List[Dict[str, Any]]:
        """Calculate which trains are affected by a delay"""
        cascade_impacts = []
        
        # Get affected train
        result = await self.db.execute(
            select(models.Train).where(models.Train.id == affected_train_id)
        )
        affected_train = result.scalars().first()
        
        if not affected_train:
            return cascade_impacts
        
        # Find connecting trains at destination station
        result = await self.db.execute(
            select(models.Train).where(
                models.Train.origin_station_id == affected_train.destination_station_id,
                models.Train.is_active == True
            )
        )
        connecting_trains = result.scalars().all()
        
        # Calculate impact for each connecting train
        for train in connecting_trains:
            # Estimate connection window (within 2 hours)
            time_gap_hours = (train.typical_duration_min - affected_train.typical_duration_min) / 60
            
            if 0 < time_gap_hours < 2:
                # Delay cascades with attenuation
                cascade_delay = int(delay_minutes * 0.7 * (1 - time_gap_hours / 2))
                
                if cascade_delay > 0:
                    impact = {
                        "downstream_train_number": train.train_number,
                        "downstream_train_name": train.train_name,
                        "estimated_delay_propagation": cascade_delay,
                        "impact_severity": "low" if cascade_delay < 10 else "medium" if cascade_delay < 30 else "high"
                    }
                    cascade_impacts.append(impact)
        
        return cascade_impacts


@router.post("/predict", response_model=Dict[str, Any])
async def predict_delay(
    train_id: str,
    weather_data: Dict[str, Any],
    signal_status: str = "normal",
    congestion_level: float = 0.5,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
) -> Dict[str, Any]:
    """
    Predict train delay using ML model
    
    Parameters:
    - train_id: UUID of the train
    - weather_data: Weather conditions (condition, temperature, wind_speed_kmh, precipitation_mm)
    - signal_status: Signal system status (normal, degraded, critical)
    - congestion_level: Platform/track congestion (0-1)
    
    Returns:
    - Predicted delay in minutes with confidence
    - Root causes analysis
    - Cascade impacts on connected trains
    """
    # Get train
    result = await db.execute(select(models.Train).where(models.Train.id == train_id))
    train = result.scalars().first()
    if not train:
        raise HTTPException(status_code=404, detail="Train not found")
    
    # Get origin station info
    result = await db.execute(select(models.Station).where(models.Station.id == train.origin_station_id))
    origin_station = result.scalars().first()
    
    # Get historical delays for this train
    result = await db.execute(
        select(models.DelayPrediction.predicted_delay_min)
        .where(models.DelayPrediction.train_id == train_id)
        .order_by(models.DelayPrediction.created_at.desc())
        .limit(30)
    )
    historical_delays = [row[0] for row in result.all()]
    
    # Predict delay
    if model is not None:
        try:
            # Use ML model for prediction
            predicted_delay_min, confidence_pct = _ml_predict(
                train, origin_station, weather_data, signal_status, congestion_level
            )
        except Exception as e:
            logger.warning(f"ML prediction failed: {e}. Using fallback.")
            predicted_delay_min, confidence_pct = _fallback_prediction(train.train_type, weather_data)
    else:
        predicted_delay_min, confidence_pct = _fallback_prediction(train.train_type, weather_data)
    
    # Identify root causes
    root_causes = _identify_root_causes(weather_data, signal_status, congestion_level)
    
    # Calculate cascade impacts
    cascade_calc = CascadeImpactCalculator(db)
    cascade_impacts = await cascade_calc.calculate(train_id, predicted_delay_min)
    
    # Store prediction record
    prediction_id = str(uuid.uuid4())
    prediction_record = models.DelayPrediction(
        id=prediction_id,
        train_id=train_id,
        predicted_delay_min=predicted_delay_min,
        confidence_pct=confidence_pct,
        root_causes=root_causes,
        weather_input=weather_data,
        signal_status=signal_status,
        congestion_level=congestion_level,
        model_version="v1"
    )
    db.add(prediction_record)
    await db.commit()
    
    # Format response
    response = {
        "train_number": train.train_number,
        "train_name": train.train_name,
        "predicted_delay_min": predicted_delay_min,
        "confidence_pct": confidence_pct,
        "root_causes": root_causes,
        "signal_status": signal_status,
        "congestion_level": congestion_level,
        "cascade_impacts": cascade_impacts,
        "prediction_id": prediction_id,
        "predicted_at": datetime.utcnow().isoformat()
    }
    
    logger.info(f"Predicted {predicted_delay_min}min delay for {train.train_number} (conf: {confidence_pct:.0f}%)")
    
    return response


@router.get("/predictions/{train_id}", response_model=List[schemas.DelayPredictionOut])
async def get_train_predictions(
    train_id: str,
    limit: int = 10,
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
) -> List[schemas.DelayPredictionOut]:
    """Get recent predictions for a specific train"""
    result = await db.execute(
        select(models.DelayPrediction)
        .where(models.DelayPrediction.train_id == train_id)
        .order_by(models.DelayPrediction.created_at.desc())
        .limit(limit)
    )
    predictions = result.scalars().all()
    return predictions


@router.get("/stats", response_model=Dict[str, Any])
async def get_prediction_stats(
    current_user: models.User = Depends(auth.get_current_user),
    db: AsyncSession = Depends(database.get_db)
) -> Dict[str, Any]:
    """Get statistics on delay predictions"""
    from sqlalchemy import func
    
    result = await db.execute(
        select(
            func.count(models.DelayPrediction.id).label("total_predictions"),
            func.avg(models.DelayPrediction.predicted_delay_min).label("avg_delay"),
            func.avg(models.DelayPrediction.confidence_pct).label("avg_confidence"),
            func.max(models.DelayPrediction.predicted_delay_min).label("max_delay"),
            func.min(models.DelayPrediction.predicted_delay_min).label("min_delay"),
        )
    )
    
    row = result.first()
    
    return {
        "total_predictions": row[0] or 0,
        "average_delay_min": float(row[1] or 0),
        "average_confidence_pct": float(row[2] or 0),
        "max_delay_min": float(row[3] or 0),
        "min_delay_min": float(row[4] or 0),
        "model_version": "v1",
        "last_updated": datetime.utcnow().isoformat()
    }


def _ml_predict(
    train: models.Train,
    origin_station: models.Station,
    weather_data: Dict,
    signal_status: str,
    congestion_level: float
) -> tuple:
    """Use ML model for prediction"""
    try:
        from ..ml.feature_engineering import DelayFeatureEngineer
        
        engineer = DelayFeatureEngineer()
        
        features, _ = engineer.engineer_features(
            train_data={
                "train_type": train.train_type,
                "typical_duration_min": train.typical_duration_min
            },
            station_data={
                "station_code": origin_station.station_code if origin_station else "UNKNOWN",
                "platform_count": origin_station.platform_count if origin_station else 5,
                "has_cctv": origin_station.has_cctv if origin_station else False,
                "zone": origin_station.zone if origin_station else "NR"
            },
            weather_data=weather_data,
            signal_data={
                "status": signal_status,
                "grid_health_pct": 95 if signal_status == "normal" else 80 if signal_status == "degraded" else 60,
            },
            congestion_data={
                "platform_occupancy_pct": congestion_level * 100,
                "track_utilization_pct": congestion_level * 85,
                "nearby_trains_count": int(congestion_level * 10),
            }
        )
        
        predictions, confidence = model.predict(features.reshape(1, -1))
        return int(predictions[0]), float(confidence[0] * 100)
    except Exception as e:
        logger.error(f"ML prediction error: {e}")
        raise


def _fallback_prediction(train_type: str, weather_data: Dict) -> tuple:
    """Fallback prediction logic without ML model"""
    # Base delays by train type
    base_delays = {
        "Rajdhani": 5,
        "Shatabdi": 3,
        "Express": 12,
        "Mail": 18,
        "Passenger": 20,
    }
    
    base_delay = base_delays.get(train_type, 10)
    
    # Weather impact
    weather_condition = weather_data.get("condition", "clear").lower()
    weather_impact = {
        "clear": 0,
        "rain": 8,
        "fog": 12,
        "snow": 25,
        "cyclone": 45,
    }.get(weather_condition, 0)
    
    predicted_delay = base_delay + weather_impact
    confidence = 75 - min(weather_impact * 2, 30)  # Lower confidence with worse weather
    
    return int(predicted_delay), float(confidence)


def _identify_root_causes(weather_data: Dict, signal_status: str, congestion_level: float) -> List[str]:
    """Identify likely root causes of delays"""
    causes = []
    
    # Weather causes
    weather = weather_data.get("condition", "").lower()
    if weather != "clear":
        causes.append(f"Adverse weather: {weather}")
    
    wind = weather_data.get("wind_speed_kmh", 0)
    if wind > 50:
        causes.append(f"High wind speed: {wind} km/h")
    
    precip = weather_data.get("precipitation_mm", 0)
    if precip > 20:
        causes.append(f"Heavy precipitation: {precip}mm")
    
    # Signal causes
    if signal_status != "normal":
        causes.append(f"Signal system {signal_status}")
    
    # Congestion causes
    if congestion_level > 0.7:
        causes.append("High platform/track congestion")
    elif congestion_level > 0.5:
        causes.append("Moderate congestion")
    
    # Default if no causes found
    if not causes:
        causes.append("Routine scheduling")
    
    return causes
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
        _MODEL_PATH, _exc,
    )

# Feature order MUST match the training column order exactly
_FEATURE_ORDER = [
    "fog_index",
    "rainfall_mm",
    "signal_status",
    "congestion_level",
    "time_of_day",
    "train_type",
]

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class NtesData(BaseModel):
    train_no: str
    current_station: str
    lat: float
    lon: float
    data_source: str = "mock"   # "live" | "mock"


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
    data_source: str = "mock"   # "live" | "mock" — mirrors ntes_data.data_source


class DelayRequest(BaseModel):
    signal_status: str = "normal"       # normal | degraded | failed
    congestion_level: float = 0.5       # 0.0-1.0


class CascadeImpact(BaseModel):
    downstream_train: str
    impact_delay_min: int


class CascadeResult(BaseModel):
    train_number: str
    cascades: List[CascadeImpact]


class CascadeTrainResult(BaseModel):
    train_no: str
    train_name: str
    propagated_delay_min: int
    position: int
    impact_level: str   # "low" | "medium" | "high"


# ---------------------------------------------------------------------------
# Cascade route data
# ---------------------------------------------------------------------------

_PROPAGATION_FACTORS: List[float] = [0.85, 0.70, 0.55, 0.40, 0.25]

# Each value is a list of (train_no, train_name) tuples in downstream order.
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
    Re-map the service's pre-computed fog_index through standard visibility
    bands for consistent ML feature encoding.

    Bands (approximate visibility in metres):
        < 200  -> 1.0  (dense fog)
        < 1000 -> 0.6  (thick fog)
        < 5000 -> 0.3  (moderate mist)
        else   -> 0.0  (clear)
    """
    fi = weather_data.fog_index          # 0.0 (clear) to 1.0 (dense fog)
    visibility_m = (1.0 - fi) * 10_000  # invert; service uses 10 000 m max

    if visibility_m < 200:
        return 1.0
    elif visibility_m < 1_000:
        return 0.6
    elif visibility_m < 5_000:
        return 0.3
    else:
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
    fog_index    = _derive_fog_index(weather_data)
    rainfall_mm  = float(weather_data.rainfall_mm)
    signal_int   = _SIGNAL_MAP.get(signal_status.lower(), 0)
    congestion   = float(max(0.0, min(1.0, congestion_level)))
    time_of_day  = datetime.now(timezone.utc).hour
    train_type   = _encode_train_type(train_no)

    vector = np.array(
        [[fog_index, rainfall_mm, signal_int, congestion, time_of_day, train_type]],
        dtype=np.float64,
    )
    logger.debug(
        "Feature vector: fog=%.2f rain=%.1f sig=%d cong=%.2f tod=%d type=%d",
        fog_index, rainfall_mm, signal_int, congestion, time_of_day, train_type,
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
    base += congestion_level * 20.0  # Reduced from 50.0 to make default delays tighter
    if signal_status == "failed":
        base += 75.0
    elif signal_status == "degraded":
        base += 25.0
    
    # Small jitter, weighted slightly positive
    base += random.uniform(-2, 5)
    return int(max(0, min(240, round(base))))


def _predict_base_delay(
    weather_data: WeatherData,
    train_no: str,
    signal_status: str = "normal",
    congestion_level: float = 0.5,
) -> int:
    """Synchronous prediction used internally (no I/O)."""
    fv = build_feature_vector(
        weather_data=weather_data,
        train_no=train_no,
        signal_status=signal_status,
        congestion_level=congestion_level,
    )
    if _model is not None:
        return max(0, min(240, int(_model.predict(fv)[0])))
    return _fallback_delay(
        float(fv[0, 0]), float(fv[0, 1]), signal_status, float(fv[0, 3])
    )


async def _predict_delay_for_train(train_no: str) -> int:
    """
    Async helper used by the cascade endpoint.
    Calls the real NTES + weather + model pipeline.
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
        logger.warning("_predict_delay_for_train(%s) failed: %s — using fallback 25", train_no, exc)
        return 25


def _compute_confidence(predicted_delay: int) -> float:
    """95 % at baseline ~15 min, decays 0.5 pp per minute of deviation. Clamped [50, 95]."""
    return round(min(95.0, max(50.0, 95.0 - abs(predicted_delay - 15) * 0.5)), 1)





# ---------------------------------------------------------------------------
# Endpoints  (cascade GET registered BEFORE the wildcard POST /{train_no})
# ---------------------------------------------------------------------------

@router.get("/cascade/{train_no}", response_model=List[CascadeTrainResult])
async def get_cascade_impact(train_no: str):
    """
    GET /api/delay/cascade/{train_no}

    Returns propagated delay for each downstream train on the same route.
    Returns an empty list (not 404) when train_no is not in the routes dict.

    Propagation factors by position:
        1 -> x0.85   2 -> x0.70   3 -> x0.55   4 -> x0.40   5 -> x0.25
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
        train_no, base_delay, len(results),
    )
    return results


@router.post("/{train_no}", response_model=DelayResult)
async def get_delay_prediction(
    train_no: str,
    request: DelayRequest,
    db: AsyncSession = Depends(database.get_db),
):
    """
    Predict delay for a given train number.

    - Fetches live location via NTES service
    - Fetches live weather via OpenWeather API
    - Builds feature vector and runs XGBoost inference
    - Persists prediction record to DB (if train found)
    """
    if len(train_no) < 4:
        raise HTTPException(status_code=400, detail="Invalid train number — must be at least 4 digits.")

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

    fog_index        = float(feature_vector[0, 0])
    rainfall_mm      = float(feature_vector[0, 1])
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

    root_causes = []

    # Weather-based causes
    if fog_index > 0.3:
        root_causes.append("FOG")
    if rainfall_mm > 5:
        root_causes.append("RAIN")

    # Signal-based cause
    if request.signal_status != "normal":
        root_causes.append("SIGNAL")

    # Congestion-based cause
    if congestion_level > 0.6:
        root_causes.append("CONGESTION")

    # Time-based cause — peak hours
    current_hour = datetime.now().hour
    if current_hour in [7, 8, 9, 17, 18, 19]:
        root_causes.append("PEAK HOURS")

    # Fallback — if nothing triggered, derive from predicted delay
    if not root_causes:
        if predicted_delay > 30:
            root_causes.append("ROUTE CONGESTION")
        elif predicted_delay > 10:
            root_causes.append("MINOR DELAY")
        else:
            root_causes.append("ON TIME")

    # DB persistence
    result = await db.execute(select(Train).where(Train.train_number == train_no))
    train  = result.scalars().first()

    if train:
        db.add(DelayPrediction(
            train_id=train.id,
            predicted_delay_min=predicted_delay,
            confidence_pct=confidence_pct,
            root_causes=root_causes,
            weather_input={
                "fog_index":   fog_index,
                "rainfall_mm": rainfall_mm,
                "condition":   weather_data.condition,
            },
            signal_status=request.signal_status,
            congestion_level=round(congestion_level, 4),
            model_version=_MODEL_VERSION,
            requested_by_ip="127.0.0.1",
        ))
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

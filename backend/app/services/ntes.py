"""
RailSense — NTES Service
Attempts to fetch live train data from the local irctc-connect bridge
(running on port 3001). Falls back gracefully to the mock dictionary
if the bridge is unavailable or returns an error.
"""

from __future__ import annotations

import logging
import random
from typing import Optional

import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Bridge config (sourced from unified pydantic settings)
# ---------------------------------------------------------------------------
_BRIDGE_TIMEOUT = 5.0  # seconds — keeps delay-prediction latency low

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------
class TrainLocation(BaseModel):
    latitude: float
    longitude: float

class TrainStatus(BaseModel):
    train_number: str
    status: str           # "Running" | "Delayed" | "Halted"
    current_location: TrainLocation
    last_reported_station: str
    delay_minutes: int
    data_source: str = "mock"   # "live" | "mock" — shown in frontend badge

# ---------------------------------------------------------------------------
# Mock train data — used as fallback when bridge is unavailable
# ---------------------------------------------------------------------------
_MOCK_TRAINS = {
    "12627": {
        "train_no": "12627",
        "train_name": "Karnataka Express",
        "current_station": "Hubballi",
        "station_name": "Hubballi Junction",
        "latitude": 15.3647,
        "longitude": 75.1240,
    },
    "12672": {
        "train_no": "12672",
        "train_name": "Nilgiri Express",
        "current_station": "Chennai Central",
        "station_name": "Chennai Central",
        "latitude": 13.0827,
        "longitude": 80.2707,
    },
    "12628": {
        "train_no": "12628",
        "train_name": "Karnataka Express",
        "current_station": "Bengaluru City",
        "station_name": "Bengaluru City",
        "latitude": 12.9716,
        "longitude": 77.5946,
    },
    "16535": {
        "train_no": "16535",
        "train_name": "Gol Gumbaz Express",
        "current_station": "Hubballi",
        "station_name": "Hubballi Junction",
        "latitude": 15.3647,
        "longitude": 75.1240,
    },
    "12301": {
        "train_no": "12301",
        "train_name": "Howrah Rajdhani",
        "current_station": "Howrah Junction",
        "station_name": "Howrah Junction",
        "latitude": 22.5958,
        "longitude": 88.2636,
    },
    "12951": {
        "train_no": "12951",
        "train_name": "Mumbai Rajdhani",
        "current_station": "Mumbai Central",
        "station_name": "Mumbai Central",
        "latitude": 18.9696,
        "longitude": 72.8197,
    },
    "12621": {
        "train_no": "12621",
        "train_name": "Tamil Nadu Express",
        "current_station": "New Delhi",
        "station_name": "New Delhi",
        "latitude": 28.6139,
        "longitude": 77.2090,
    },
    "11301": {
        "train_no": "11301",
        "train_name": "Udyan Express",
        "current_station": "Mumbai CST",
        "station_name": "Mumbai CST",
        "latitude": 18.9398,
        "longitude": 72.8355,
    },
}

# ---------------------------------------------------------------------------
# Live fetch via bridge
# ---------------------------------------------------------------------------
async def _fetch_live(train_number: str) -> Optional[TrainStatus]:
    """
    Calls GET /track/{train_number} on the ntes-bridge Node.js service.
    Returns a TrainStatus on success, None on any failure.
    """
    url = f"{settings.NTES_BRIDGE_URL}/track/{train_number}"
    try:
        async with httpx.AsyncClient(timeout=_BRIDGE_TIMEOUT) as client:
            resp = await client.get(url)

        if resp.status_code != 200:
            logger.warning(
                "ntes-bridge returned HTTP %d for train %s",
                resp.status_code, train_number,
            )
            return None

        data = resp.json()

        return TrainStatus(
            train_number=train_number,
            status=data.get("status", "Running"),
            current_location=TrainLocation(
                latitude=float(data["latitude"]),
                longitude=float(data["longitude"]),
            ),
            last_reported_station=data.get("station_name", "Unknown"),
            delay_minutes=int(data.get("delay_minutes", 0)),
            data_source="live",
        )

    except httpx.ConnectError:
        logger.warning("ntes-bridge not reachable at %s — using mock data", settings.NTES_BRIDGE_URL)
        return None
    except Exception as exc:
        logger.warning("ntes-bridge error for train %s: %s — using mock data", train_number, exc)
        return None

# ---------------------------------------------------------------------------
# Mock fallback
# ---------------------------------------------------------------------------
def _mock_status(train_number: str) -> TrainStatus:
    """Return a mock TrainStatus, using the dictionary if the number is known."""
    statuses = ["Running", "Delayed", "Halted"]
    status = random.choices(statuses, weights=[0.7, 0.2, 0.1])[0]
    delay_minutes = random.randint(15, 180) if status == "Delayed" else 0

    if train_number in _MOCK_TRAINS:
        data = _MOCK_TRAINS[train_number]
        return TrainStatus(
            train_number=train_number,
            status=status,
            current_location=TrainLocation(
                latitude=data["latitude"],
                longitude=data["longitude"],
            ),
            last_reported_station=data["current_station"],
            delay_minutes=delay_minutes,
            data_source="mock",
        )

    # Unknown train — random coords within India
    return TrainStatus(
        train_number=train_number,
        status=status,
        current_location=TrainLocation(
            latitude=round(random.uniform(15.0, 30.0), 4),
            longitude=round(random.uniform(73.0, 85.0), 4),
        ),
        last_reported_station=f"Station_{random.randint(100, 999)}",
        delay_minutes=delay_minutes,
        data_source="mock",
    )

# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------
async def get_live_train_status(train_number: str) -> TrainStatus:
    """
    Primary entry point.
    1. Tries the irctc-connect bridge for real live data.
    2. Falls back to mock data if bridge is unreachable or errors.
    """
    live = await _fetch_live(train_number)
    if live is not None:
        logger.info("Live data fetched for train %s via ntes-bridge", train_number)
        return live

    logger.info("Using mock data for train %s", train_number)
    return _mock_status(train_number)

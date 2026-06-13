from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from ..database import get_db
from ..models import DelayPrediction, PlatformAnalysis, Station, TrackAnalysis

router = APIRouter(prefix="/api/impact", tags=["Impact Dashboard"])


class ImpactMetrics(BaseModel):
    stations_deployed: int
    track_km_monitored: int
    avg_delay_saved_min: int

    passenger_hours_saved_day: int
    annual_fuel_savings_cr: float
    animal_lives_saved_yr: int
    incidents_prevented_yr: int


@router.get("/", response_model=ImpactMetrics)
async def get_impact_metrics(
    stations: int = 50,
    track_km: int = 1000,
    delay_saved: int = 15,
    db: AsyncSession = Depends(get_db),
):
    # Fetch real counts from DB if available, else fallback to params
    result_stations = await db.execute(select(func.count(Station.id)))
    db_stations = result_stations.scalar()

    result_pa = await db.execute(select(func.count(PlatformAnalysis.id)))
    platform_incidents = result_pa.scalar() or 0

    result_ta = await db.execute(select(func.count(TrackAnalysis.id)))
    track_incidents = result_ta.scalar() or 0

    result_dp = await db.execute(select(func.avg(DelayPrediction.predicted_delay_min)))
    avg_predicted_delay = result_dp.scalar() or delay_saved

    actual_stations = db_stations if db_stations > 0 else stations
    actual_delay_saved = int(avg_predicted_delay)

    passengers_per_station = 50000
    trains_per_day = 100

    passenger_hours_saved = int(
        (actual_stations * trains_per_day * actual_delay_saved * passengers_per_station)
        / 60
    )
    fuel_savings_cr = round(
        (trains_per_day * actual_delay_saved * 365 * 1000) / 10000000, 2
    )
    animal_lives = int(track_km / 100 * 2)

    db_incidents = platform_incidents + track_incidents
    incidents_prevented = db_incidents if db_incidents > 0 else int(actual_stations / 5)

    return ImpactMetrics(
        stations_deployed=actual_stations,
        track_km_monitored=track_km,
        avg_delay_saved_min=actual_delay_saved,
        passenger_hours_saved_day=passenger_hours_saved,
        annual_fuel_savings_cr=fuel_savings_cr,
        animal_lives_saved_yr=animal_lives,
        incidents_prevented_yr=incidents_prevented,
    )

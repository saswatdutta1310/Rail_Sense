from fastapi import APIRouter
from pydantic import BaseModel

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
async def get_impact_metrics(stations: int = 50, track_km: int = 1000, delay_saved: int = 15):
    passengers_per_station = 50000
    trains_per_day = 100
    
    passenger_hours_saved = int((stations * trains_per_day * delay_saved * passengers_per_station) / 60)
    fuel_savings_cr = round((trains_per_day * delay_saved * 365 * 1000) / 10000000, 2)
    animal_lives = int(track_km / 100 * 2)
    incidents_prevented = int(stations / 5)
    
    return ImpactMetrics(
        stations_deployed=stations,
        track_km_monitored=track_km,
        avg_delay_saved_min=delay_saved,
        passenger_hours_saved_day=passenger_hours_saved,
        annual_fuel_savings_cr=fuel_savings_cr,
        animal_lives_saved_yr=animal_lives,
        incidents_prevented_yr=incidents_prevented
    )

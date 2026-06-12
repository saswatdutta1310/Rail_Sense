import logging

import httpx
from pydantic import BaseModel

from app.config import settings

logger = logging.getLogger(__name__)


class WeatherData(BaseModel):
    fog_index: float
    rainfall_mm: float
    condition: str = "Clear"


async def get_live_weather(lat: float, lon: float) -> WeatherData:
    """
    Calls the OpenWeather API and returns calculated Fog Index and Rainfall.
    """
    api_key = settings.OPENWEATHER_API_KEY
    if not api_key:
        logger.warning("OpenWeather API key is not configured, returning mock data.")
        return WeatherData(fog_index=0.1, rainfall_mm=0.0)

    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"lat": lat, "lon": lon, "appid": api_key, "units": "metric"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, params=params, timeout=10.0)
            response.raise_for_status()
            data = response.json()

            # Extract visibility in meters (max 10000m)
            visibility = data.get("visibility", 10000)

            # Calculate Fog Index: 0.0 (clear) to 1.0 (dense fog)
            # Using 10000m as standard max visibility.
            fog_index = 1.0 - (visibility / 10000.0)
            fog_index = max(0.0, min(1.0, fog_index))

            # Extract rainfall in the last 1 hour
            rainfall_mm = 0.0
            if "rain" in data and "1h" in data["rain"]:
                rainfall_mm = float(data["rain"]["1h"])

            condition = data.get("weather", [{"main": "Clear"}])[0].get("main", "Clear")

            return WeatherData(
                fog_index=fog_index, rainfall_mm=rainfall_mm, condition=condition
            )

    except Exception as e:
        logger.error(f"Error fetching live weather data: {e}. Returning mock data.")
        return WeatherData(fog_index=0.2, rainfall_mm=5.0, condition="Unknown")

import random
from typing import List

from pydantic import BaseModel


class PlatformAllocation(BaseModel):
    train_number: str
    station_code: str
    allocated_platform: int
    expected_arrival_time: str
    status: str  # "Confirmed", "Tentative", "Changed"


class OperationalAlert(BaseModel):
    alert_id: str
    severity: str
    message: str
    affected_routes: List[str]


async def get_platform_allocation(
    train_number: str, station_code: str
) -> PlatformAllocation:
    """
    Mock Railway Service to get platform allocations.
    """
    platforms = [1, 2, 3, 4, 5, 6, 7, 8]
    status_options = ["Confirmed", "Tentative", "Changed"]

    return PlatformAllocation(
        train_number=train_number,
        station_code=station_code,
        allocated_platform=random.choice(platforms),
        expected_arrival_time="14:30:00",
        status=random.choices(status_options, weights=[0.8, 0.1, 0.1])[0],
    )


async def get_operational_alerts() -> List[OperationalAlert]:
    """
    Mock Railway Service for network-wide operational alerts.
    """
    return [
        OperationalAlert(
            alert_id="ALERT_001",
            severity="Medium",
            message="Track maintenance between Station A and Station B.",
            affected_routes=["Route_1", "Route_2"],
        )
    ]

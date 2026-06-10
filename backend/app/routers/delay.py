from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
import random

router = APIRouter(prefix="/api/delay", tags=["Delay Predictor"])

class DelayResult(BaseModel):
    train_number: str
    predicted_delay_min: int
    confidence_pct: float
    root_causes: List[str]

class CascadeImpact(BaseModel):
    downstream_train: str
    impact_delay_min: int

class CascadeResult(BaseModel):
    train_number: str
    cascades: List[CascadeImpact]

# Mock ML Prediction logic
def predict_delay(train_number: str, fog_index: float, rainfall: float, signal_status: str):
    # Simulate an XGBoost model prediction
    base_delay = 10
    if fog_index > 0.7:
        base_delay += 40
    if rainfall > 50:
        base_delay += 20
    if signal_status == "failed":
        base_delay += 60
    elif signal_status == "degraded":
        base_delay += 25
    
    # Add some random variance
    predicted = int(base_delay + random.uniform(-10, 15))
    predicted = max(0, predicted)
    
    causes = []
    if fog_index > 0.5: causes.append("FOG")
    if rainfall > 30: causes.append("HEAVY RAIN")
    if signal_status != "normal": causes.append("SIGNAL FAULT")
    if not causes: causes.append("CONGESTION")
    
    confidence = round(random.uniform(75.0, 95.0), 1)
    
    return DelayResult(
        train_number=train_number,
        predicted_delay_min=predicted,
        confidence_pct=confidence,
        root_causes=causes
    )

@router.get("/{train_no}", response_model=DelayResult)
async def get_delay_prediction(
    train_no: str, 
    fog_index: float = 0.0, 
    rainfall: float = 0.0, 
    signal_status: str = "normal"
):
    if len(train_no) < 4:
        raise HTTPException(status_code=400, detail="Invalid train number")
    return predict_delay(train_no, fog_index, rainfall, signal_status)

@router.get("/cascade/{train_no}", response_model=CascadeResult)
async def get_cascade_analysis(train_no: str):
    # Mock downstream cascade
    cascades = []
    num_affected = random.randint(2, 6)
    for i in range(num_affected):
        cascades.append(CascadeImpact(
            downstream_train=f"TRN-{random.randint(10000, 99999)}",
            impact_delay_min=random.randint(5, 45)
        ))
    return CascadeResult(train_number=train_no, cascades=cascades)

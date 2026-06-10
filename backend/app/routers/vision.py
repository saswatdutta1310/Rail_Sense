from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import random
import uuid

router = APIRouter(prefix="/api/vision", tags=["Vision AI Modules"])

class DetectionBox(BaseModel):
    label: str
    confidence: float
    x: int
    y: int
    w: int
    h: int

class PlatformAnalysisResult(BaseModel):
    analysis_id: str
    crowd_density_score: float
    alert_level: str
    fall_detected: bool
    detections: List[DetectionBox]

class TrackDefect(BaseModel):
    defect_class: str
    confidence: float
    risk_score: float
    recommended_action: str

class TrackAnalysisResult(BaseModel):
    analysis_id: str
    defects_found: int
    maintenance_priority: str
    defects: List[TrackDefect]

@router.post("/platform", response_model=PlatformAnalysisResult)
async def analyze_platform_camera(file: UploadFile = File(...)):
    # Mock YOLOv5 crowd and fall detection
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    crowd_density = round(random.uniform(1.0, 8.5), 1)
    fall_detected = random.choice([True, False, False, False]) # 25% chance of fall
    
    alert_level = "Normal"
    if crowd_density > 6.0 or fall_detected:
        alert_level = "Red - High Risk"
    elif crowd_density > 4.0:
        alert_level = "Yellow - Elevated"
        
    detections = []
    for _ in range(int(crowd_density * 5)):
        detections.append(DetectionBox(
            label="person",
            confidence=round(random.uniform(0.6, 0.99), 2),
            x=random.randint(0, 500),
            y=random.randint(0, 500),
            w=random.randint(20, 50),
            h=random.randint(50, 100)
        ))
        
    if fall_detected:
        detections.append(DetectionBox(
            label="fallen_person",
            confidence=round(random.uniform(0.8, 0.99), 2),
            x=random.randint(0, 500),
            y=random.randint(0, 500),
            w=random.randint(80, 120),
            h=random.randint(30, 60)
        ))
        
    return PlatformAnalysisResult(
        analysis_id=str(uuid.uuid4()),
        crowd_density_score=crowd_density,
        alert_level=alert_level,
        fall_detected=fall_detected,
        detections=detections
    )

@router.post("/track", response_model=TrackAnalysisResult)
async def analyze_track_imagery(file: UploadFile = File(...)):
    # Mock Track Defect Detection
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    defects_found = random.randint(0, 3)
    defects = []
    defect_types = ["Cracked Fastener", "Missing Clip", "Weld Defect", "Surface Flaw"]
    
    priority = "Low"
    max_risk = 0
    
    for _ in range(defects_found):
        dtype = random.choice(defect_types)
        risk = round(random.uniform(3.0, 9.5), 1)
        if risk > max_risk: max_risk = risk
        
        action = "Schedule Maintenance"
        if risk > 8.0: action = "Immediate Stop & Inspect"
        
        defects.append(TrackDefect(
            defect_class=dtype,
            confidence=round(random.uniform(0.7, 0.98), 2),
            risk_score=risk,
            recommended_action=action
        ))
        
    if max_risk > 8.0:
        priority = "Critical"
    elif max_risk > 5.0:
        priority = "High"
    elif defects_found > 0:
        priority = "Medium"
        
    return TrackAnalysisResult(
        analysis_id=str(uuid.uuid4()),
        defects_found=defects_found,
        maintenance_priority=priority,
        defects=defects
    )

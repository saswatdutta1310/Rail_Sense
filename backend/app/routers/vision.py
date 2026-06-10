from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import List, Optional
import random
import uuid

from app.database import get_db
from app.models import PlatformAnalysis, TrackAnalysis, Station, User, AlertLevelEnum, PriorityLevelEnum

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
async def analyze_platform_camera(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # Mock YOLOv5 crowd and fall detection
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    # Get a dummy station for MVP
    result = await db.execute(select(Station).limit(1))
    station = result.scalars().first()
    
    crowd_density = round(random.uniform(1.0, 8.5), 1)
    fall_detected = random.choice([True, False, False, False]) # 25% chance of fall
    
    alert_level_str = "green"
    if crowd_density > 6.0 or fall_detected:
        alert_level_str = "critical"
    elif crowd_density > 4.0:
        alert_level_str = "yellow"
        
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
        
    analysis_id = str(uuid.uuid4())
    
    if station:
        db_record = PlatformAnalysis(
            id=analysis_id,
            station_id=station.id,
            platform_number=1,
            image_url=file.filename,
            alert_level=AlertLevelEnum(alert_level_str),
            crowd_density=crowd_density,
            fall_detected=fall_detected,
            person_count=len(detections),
            detection_metadata=[d.model_dump() for d in detections],
            model_version="yolov5-crowd-v2"
        )
        db.add(db_record)
        await db.commit()
        
    alert_ui_level = "Normal"
    if alert_level_str == "critical": alert_ui_level = "Red - High Risk"
    elif alert_level_str == "yellow": alert_ui_level = "Yellow - Elevated"
        
    return PlatformAnalysisResult(
        analysis_id=analysis_id,
        crowd_density_score=crowd_density,
        alert_level=alert_ui_level,
        fall_detected=fall_detected,
        detections=detections
    )

@router.post("/track", response_model=TrackAnalysisResult)
async def analyze_track_imagery(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    # Mock Track Defect Detection
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")
    
    defects_found = random.randint(0, 3)
    defects = []
    defect_types = ["Cracked Fastener", "Missing Clip", "Weld Defect", "Surface Flaw"]
    
    priority_str = "low"
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
        priority_str = "critical"
    elif max_risk > 5.0:
        priority_str = "high"
    elif defects_found > 0:
        priority_str = "medium"
        
    analysis_id = str(uuid.uuid4())
    
    db_record = TrackAnalysis(
        id=analysis_id,
        image_url=file.filename,
        risk_score=max_risk,
        priority_level=PriorityLevelEnum(priority_str),
        defect_count=defects_found,
        defects=[d.model_dump() for d in defects],
        model_version="vit-track-v1"
    )
    db.add(db_record)
    await db.commit()
    
    ui_priority = priority_str.capitalize()
        
    return TrackAnalysisResult(
        analysis_id=analysis_id,
        defects_found=defects_found,
        maintenance_priority=ui_priority,
        defects=defects
    )

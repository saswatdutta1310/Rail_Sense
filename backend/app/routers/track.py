import json
import logging
import random

from fastapi import APIRouter, File, Form, UploadFile
from fastapi.responses import JSONResponse

from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Track Inspector"])

# Lazy-init Gemini to avoid crashing the entire app if key is missing
_model = None
_genai_configured = False


def _get_gemini_model():
    global _model, _genai_configured
    if _model is not None:
        return _model
    if _genai_configured:
        return None  # Already tried and failed
    _genai_configured = True
    api_key = settings.gemini_api_key
    if not api_key:
        logger.warning(
            "GEMINI_API_KEY not set — track analysis will return mock results"
        )
        return None
    try:
        import google.generativeai as genai

        genai.configure(api_key=api_key)
        _model = genai.GenerativeModel("gemini-2.5-flash")
        logger.info("Gemini model initialized successfully")
        return _model
    except Exception as e:
        logger.error("Failed to initialize Gemini: %s", e)
        return None


RISK_SCORES = {
    "Cracked Fastener": 7.3,
    "Missing Clip": 5.8,
    "Ballast Fouling": 6.2,
    "Rail Fracture": 9.1,
    "Track Geometry Fault": 8.4,
    "Corrosion": 6.0,
    "Broken Rail": 9.5,
    "Loose Bolt": 5.2,
    "No Defect": 0.5,
}


def get_severity(risk: float) -> str:
    if risk >= 7.0:
        return "HIGH"
    elif risk >= 4.0:
        return "MEDIUM"
    return "LOW"


def get_priority(defects: list) -> str:
    if any(d.get("severity") == "HIGH" for d in defects):
        return "IMMEDIATE"
    elif any(d.get("severity") == "MEDIUM" for d in defects):
        return "SCHEDULED"
    return "MONITOR"


@router.post("/analyze")
async def analyze_track(
    file: UploadFile = File(...), kilometer_marker: str = Form(default="KM 0.0")
):
    contents = await file.read()
    mime_type = file.content_type or "image/jpeg"

    gemini_model = _get_gemini_model()

    # If Gemini is not available, return a mock result
    if gemini_model is None:
        mock_defects = [
            {
                "defect_class": "Cracked Fastener",
                "class": "Cracked Fastener",
                "confidence": 92.3,
                "risk_score": 7.3,
                "severity": "HIGH",
                "location": kilometer_marker,
                "recommended_action": "Immediate Stop & Inspect",
            },
            {
                "defect_class": "Ballast Fouling",
                "class": "Ballast Fouling",
                "confidence": 85.1,
                "risk_score": 6.2,
                "severity": "MEDIUM",
                "location": kilometer_marker,
                "recommended_action": "Schedule Maintenance",
            },
        ]
        selected = random.sample(mock_defects, k=random.randint(1, 2))
        priority = get_priority(selected)
        return {
            "defects": selected,
            "defects_found": len(selected),
            "maintenance_priority": priority,
            "confidence": 87.5,
            "track_condition": "FAIR",
            "summary": "Mock analysis — Gemini API key not configured. Configure GEMINI_API_KEY in .env for real AI analysis.",
            "status": "mock",
            "file_received": file.filename,
            "kilometer_marker": kilometer_marker,
            "model_version": "mock-fallback",
        }

    PROMPT = """You are an expert railway track inspection AI for Indian Railways.

Analyze this image carefully for any railway track defects.

Look specifically for:
- Cracked Fastener: cracks in rail fastening hardware
- Missing Clip: absent spring clips or rail anchors
- Ballast Fouling: contaminated or degraded ballast/gravel
- Rail Fracture: breaks or fractures in the rail itself
- Track Geometry Fault: misaligned, uneven, or buckled track
- Corrosion: heavy rust on rails or fasteners
- Broken Rail: complete breaks in the rail
- Loose Bolt: visibly loose or missing bolts
- No Defect: track appears in good condition

Respond ONLY with a valid raw JSON object.
No explanation, no markdown, no code fences. Just JSON:

{
  "defects": [
    {
      "defect_class": "exact defect name from list above",
      "confidence": 87.5,
      "risk_score": 7.3,
      "severity": "HIGH",
      "location": "describe where in image"
    }
  ],
  "defects_found": 1,
  "overall_confidence": 91.0,
  "track_condition": "POOR",
  "summary": "one sentence describing the finding"
}

Rules:
- severity: HIGH if risk>=7, MEDIUM if 4-7, LOW if <4
- track_condition: CRITICAL / POOR / FAIR / GOOD / EXCELLENT
- maintenance_priority: IMMEDIATE if HIGH, SCHEDULED if MEDIUM, MONITOR if LOW/none
- If not a railway image: defects_found:0, track_condition:UNKNOWN
- List ALL visible defects
- All numbers must be floats, not strings
"""

    try:
        # Pass image bytes directly — no temp file needed
        image_part = {"mime_type": mime_type, "data": contents}

        response = gemini_model.generate_content([PROMPT, image_part])
        response_text = response.text.strip()

        # Strip markdown fences if Gemini added them
        if "```" in response_text:
            parts = response_text.split("```")
            for part in parts:
                part = part.strip()
                if part.startswith("json"):
                    part = part[4:].strip()
                if part.startswith("{"):
                    response_text = part
                    break

        result = json.loads(response_text)

        # Enrich defects with risk scores
        enriched = []
        for d in result.get("defects", []):
            cls = d.get("defect_class", "Unknown")
            risk = RISK_SCORES.get(cls, float(d.get("risk_score", 5.0)))
            severity = get_severity(risk)
            enriched.append(
                {
                    "defect_class": cls,
                    "class": cls,
                    "confidence": round(float(d.get("confidence", 80.0)), 1),
                    "risk_score": round(risk, 1),
                    "severity": severity,
                    "location": d.get("location", kilometer_marker),
                    "recommended_action": (
                        "Immediate Stop & Inspect"
                        if severity == "HIGH"
                        else "Schedule Maintenance"
                    ),
                }
            )

        priority = get_priority(enriched)

        return {
            "defects": enriched,
            "defects_found": len(enriched),
            "maintenance_priority": priority,
            "confidence": round(float(result.get("overall_confidence", 85.0)), 1),
            "track_condition": result.get("track_condition", "UNKNOWN"),
            "summary": result.get("summary", "Analysis complete."),
            "status": "complete",
            "file_received": file.filename,
            "kilometer_marker": kilometer_marker,
            "model_version": "gemini-2.5-flash",
        }

    except json.JSONDecodeError as e:
        return JSONResponse(
            status_code=422,
            content={
                "error": "Failed to parse Gemini response",
                "detail": str(e),
                "status": "error",
            },
        )
    except Exception as e:
        logger.error("Track analysis error: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Analysis failed", "detail": str(e), "status": "error"},
        )

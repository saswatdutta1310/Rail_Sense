from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import google.generativeai as genai
import json
import os
import tempfile
import pathlib
from dotenv import load_dotenv

load_dotenv()
router = APIRouter(tags=["Track Inspector"])

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-2.5-flash")

RISK_SCORES = {
    "Cracked Fastener":     7.3,
    "Missing Clip":         5.8,
    "Ballast Fouling":      6.2,
    "Rail Fracture":        9.1,
    "Track Geometry Fault": 8.4,
    "Corrosion":            6.0,
    "Broken Rail":          9.5,
    "Loose Bolt":           5.2,
    "No Defect":            0.5,
}

def get_severity(risk: float) -> str:
    if risk >= 7.0: return "HIGH"
    elif risk >= 4.0: return "MEDIUM"
    return "LOW"

def get_priority(defects: list) -> str:
    if any(d["severity"] == "HIGH" for d in defects):
        return "IMMEDIATE"
    elif any(d["severity"] == "MEDIUM" for d in defects):
        return "SCHEDULED"
    return "MONITOR"


@router.post("/analyze")
async def analyze_track(
    file: UploadFile = File(...),
    kilometer_marker: str = Form(default="KM 0.0")
):
    contents = await file.read()

    # Save to temp file so Gemini can read it
    suffix = pathlib.Path(file.filename or "image.jpg").suffix or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

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
        image_part = {
            "mime_type": file.content_type or "image/jpeg",
            "data": contents
        }

        response = model.generate_content([PROMPT, image_part])
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
            enriched.append({
                "defect_class": cls,
                "class": cls,
                "confidence": round(float(d.get("confidence", 80.0)), 1),
                "risk_score": round(risk, 1),
                "severity": severity,
                "location": d.get("location", kilometer_marker)
            })

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
            "model_version": "gemini-2.5-flash"
        }

    except json.JSONDecodeError as e:
        return JSONResponse(status_code=422, content={
            "error": "Failed to parse Gemini response",
            "detail": str(e),
            "status": "error"
        })
    except Exception as e:
        return JSONResponse(status_code=500, content={
            "error": "Analysis failed",
            "detail": str(e),
            "status": "error"
        })
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except Exception:
            pass

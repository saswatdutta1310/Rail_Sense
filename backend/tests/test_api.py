import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_delay_prediction():
    response = client.get("/api/delay/12301?fog_index=0.8&rainfall=60&signal_status=normal")
    assert response.status_code == 200
    data = response.json()
    assert data["train_number"] == "12301"
    assert data["predicted_delay_min"] > 0
    assert "FOG" in data["root_causes"]

def test_impact_metrics():
    response = client.get("/api/impact/?stations=100&track_km=500&delay_saved=20")
    assert response.status_code == 200
    data = response.json()
    assert data["stations_deployed"] == 100
    assert data["track_km_monitored"] == 500
    assert data["avg_delay_saved_min"] == 20
    assert data["passenger_hours_saved_day"] > 0

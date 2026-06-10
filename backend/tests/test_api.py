import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import engine, Base


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_delay_prediction(client):
    response = await client.get("/api/delay/12301?fog_index=0.8&rainfall=60&signal_status=normal")
    assert response.status_code == 200
    data = response.json()
    assert data["train_number"] == "12301"
    assert data["predicted_delay_min"] >= 0
    assert "FOG" in data["root_causes"]


@pytest.mark.asyncio
async def test_impact_metrics(client):
    response = await client.get("/api/impact/?stations=100&track_km=500&delay_saved=20")
    assert response.status_code == 200
    data = response.json()
    assert data["track_km_monitored"] == 500
    assert data["passenger_hours_saved_day"] > 0

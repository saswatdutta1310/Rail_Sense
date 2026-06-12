"""
Integration tests for core API endpoints.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db


# ---------------------------------------------------------------------------
# Test database — in-memory SQLite
# ---------------------------------------------------------------------------
DATABASE_TEST_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(
    DATABASE_TEST_URL,
    connect_args={"check_same_thread": False},
    echo=False,
)

TestingSessionLocal = sessionmaker(
    engine_test, class_=AsyncSession, expire_on_commit=False
)


async def override_get_db():
    async with TestingSessionLocal() as session:
        yield session


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient):
    """Register + login a test user, return access token."""
    await client.post(
        "/api/auth/register",
        json={
            "email": "apitest@railsense.ai",
            "password": "testpass123",
            "full_name": "API Test User",
            "role": "public",
        },
    )
    response = await client.post(
        "/api/auth/login",
        data={"username": "apitest@railsense.ai", "password": "testpass123"},
    )
    return response.json()["access_token"]


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


# ---------------------------------------------------------------------------
# Delay prediction
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_delay_prediction_returns_valid_structure(
    client: AsyncClient, auth_token: str
):
    """POST /api/delay/{train_no} returns correct response shape."""
    response = await client.post(
        "/api/delay/12301",
        json={"signal_status": "normal", "congestion_level": 0.5},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["train_number"] == "12301"
    assert isinstance(data["predicted_delay_min"], int)
    assert data["predicted_delay_min"] >= 0
    assert isinstance(data["confidence_pct"], float)
    assert isinstance(data["root_causes"], list)
    assert "data_source" in data


@pytest.mark.asyncio
async def test_delay_prediction_invalid_train_number(
    client: AsyncClient, auth_token: str
):
    """Short train numbers should be rejected with 400."""
    response = await client.post(
        "/api/delay/12",
        json={"signal_status": "normal", "congestion_level": 0.5},
        headers={"Authorization": f"Bearer {auth_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delay_prediction_no_auth(client: AsyncClient):
    """Unauthenticated requests should be rejected."""
    response = await client.post(
        "/api/delay/12301",
        json={"signal_status": "normal", "congestion_level": 0.5},
    )
    assert response.status_code in (401, 403)


# ---------------------------------------------------------------------------
# Cascade impact (public endpoint — no auth needed)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cascade_known_train(client: AsyncClient):
    """Known train returns a list of downstream impacts."""
    response = await client.get("/api/delay/cascade/12627")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    # 12627 is in the cascade routes dict — should have 5 downstream trains
    assert len(data) == 5
    first = data[0]
    assert "train_no" in first
    assert "propagated_delay_min" in first
    assert "impact_level" in first


@pytest.mark.asyncio
async def test_cascade_unknown_train(client: AsyncClient):
    """Unknown train returns an empty list, not a 404."""
    response = await client.get("/api/delay/cascade/99999")
    assert response.status_code == 200
    assert response.json() == []


# ---------------------------------------------------------------------------
# Impact dashboard
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_impact_metrics(client: AsyncClient):
    """GET /api/impact/ returns all required KPI fields."""
    response = await client.get("/api/impact/?stations=50&track_km=500&delay_saved=15")
    assert response.status_code == 200
    data = response.json()
    assert "stations_deployed" in data
    assert "track_km_monitored" in data
    assert "avg_delay_saved_min" in data
    assert "passenger_hours_saved_day" in data
    assert data["track_km_monitored"] == 500
    assert data["passenger_hours_saved_day"] >= 0

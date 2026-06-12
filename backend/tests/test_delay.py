"""
Tests for delay prediction endpoints.
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models import Station, Train, User, RoleEnum
from app.auth import get_password_hash
import uuid


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


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_test_db():
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


@pytest_asyncio.fixture(scope="module")
async def test_user():
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            email="delaytest@railsense.ai",
            password_hash=get_password_hash("testpass123"),
            full_name="Delay Test User",
            role=RoleEnum.public,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


@pytest_asyncio.fixture
async def auth_token(client: AsyncClient, test_user):
    response = await client.post(
        "/api/auth/login",
        data={"username": "delaytest@railsense.ai", "password": "testpass123"},
    )
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


# ---------------------------------------------------------------------------
# Delay prediction endpoint: POST /api/delay/{train_no}
# ---------------------------------------------------------------------------


class TestDelayPrediction:

    @pytest.mark.asyncio
    async def test_predict_known_train(self, client: AsyncClient, auth_token: str):
        """Predict delay for a well-known train number."""
        response = await client.post(
            "/api/delay/12627",
            json={"signal_status": "normal", "congestion_level": 0.5},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["train_number"] == "12627"
        assert isinstance(data["predicted_delay_min"], int)
        assert 0 <= data["predicted_delay_min"] <= 240
        assert isinstance(data["confidence_pct"], float)
        assert 50.0 <= data["confidence_pct"] <= 95.0
        assert isinstance(data["root_causes"], list)
        assert len(data["root_causes"]) >= 1

    @pytest.mark.asyncio
    async def test_predict_custom_train(self, client: AsyncClient, auth_token: str):
        """Predict delay for a custom (unknown) train number."""
        response = await client.post(
            "/api/delay/11057",
            json={"signal_status": "normal", "congestion_level": 0.3},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["train_number"] == "11057"
        assert data["predicted_delay_min"] >= 0

    @pytest.mark.asyncio
    async def test_predict_failed_signal_increases_delay(
        self, client: AsyncClient, auth_token: str
    ):
        """A failed signal should result in a higher delay than normal signal."""
        normal = await client.post(
            "/api/delay/12951",
            json={"signal_status": "normal", "congestion_level": 0.1},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        failed = await client.post(
            "/api/delay/12951",
            json={"signal_status": "failed", "congestion_level": 0.1},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert normal.status_code == 200
        assert failed.status_code == 200
        # Failed signal delay should be >= normal (fallback adds 75 min for failed)
        assert failed.json()["predicted_delay_min"] >= normal.json()["predicted_delay_min"]

    @pytest.mark.asyncio
    async def test_predict_high_congestion_causes_tag(
        self, client: AsyncClient, auth_token: str
    ):
        """High congestion (>0.6) should tag CONGESTION as a root cause."""
        response = await client.post(
            "/api/delay/12301",
            json={"signal_status": "normal", "congestion_level": 0.9},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "CONGESTION" in data["root_causes"]

    @pytest.mark.asyncio
    async def test_predict_train_too_short(self, client: AsyncClient, auth_token: str):
        """Train number shorter than 4 digits → 400."""
        response = await client.post(
            "/api/delay/12",
            json={"signal_status": "normal", "congestion_level": 0.5},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_predict_no_auth_returns_401_or_403(self, client: AsyncClient):
        """No token → 401/403."""
        response = await client.post(
            "/api/delay/12627",
            json={"signal_status": "normal", "congestion_level": 0.5},
        )
        assert response.status_code in (401, 403)

    @pytest.mark.asyncio
    async def test_predict_invalid_token(self, client: AsyncClient):
        """Invalid token → 401."""
        response = await client.post(
            "/api/delay/12627",
            json={"signal_status": "normal", "congestion_level": 0.5},
            headers={"Authorization": "Bearer this-is-not-a-valid-token"},
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_predict_returns_ntes_data(self, client: AsyncClient, auth_token: str):
        """Response should include ntes_data with lat/lon."""
        response = await client.post(
            "/api/delay/12627",
            json={"signal_status": "normal", "congestion_level": 0.5},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "ntes_data" in data
        assert "lat" in data["ntes_data"]
        assert "lon" in data["ntes_data"]

    @pytest.mark.asyncio
    async def test_predict_returns_weather_data(self, client: AsyncClient, auth_token: str):
        """Response should include weather_data."""
        response = await client.post(
            "/api/delay/12627",
            json={"signal_status": "normal", "congestion_level": 0.5},
            headers={"Authorization": f"Bearer {auth_token}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "weather_data" in data
        assert "fog_index" in data["weather_data"]
        assert "rainfall_mm" in data["weather_data"]
        assert "condition" in data["weather_data"]


# ---------------------------------------------------------------------------
# Cascade endpoint: GET /api/delay/cascade/{train_no}
# ---------------------------------------------------------------------------


class TestCascadeImpact:

    @pytest.mark.asyncio
    async def test_cascade_known_train_returns_list(self, client: AsyncClient):
        """Known train returns exactly 5 downstream impacts."""
        response = await client.get("/api/delay/cascade/12627")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 5

    @pytest.mark.asyncio
    async def test_cascade_result_structure(self, client: AsyncClient):
        """Each cascade entry has required fields."""
        response = await client.get("/api/delay/cascade/12301")
        assert response.status_code == 200
        for entry in response.json():
            assert "train_no" in entry
            assert "train_name" in entry
            assert "propagated_delay_min" in entry
            assert "position" in entry
            assert "impact_level" in entry
            assert entry["impact_level"] in ("low", "medium", "high")

    @pytest.mark.asyncio
    async def test_cascade_propagation_decreases(self, client: AsyncClient):
        """Propagated delay should decrease with position (attenuation)."""
        response = await client.get("/api/delay/cascade/12951")
        assert response.status_code == 200
        delays = [e["propagated_delay_min"] for e in response.json()]
        # Each downstream train should have <= delay of the previous one
        for i in range(1, len(delays)):
            assert delays[i] <= delays[i - 1]

    @pytest.mark.asyncio
    async def test_cascade_unknown_train_returns_empty_list(self, client: AsyncClient):
        """Unknown train returns [] not 404."""
        response = await client.get("/api/delay/cascade/99999")
        assert response.status_code == 200
        assert response.json() == []

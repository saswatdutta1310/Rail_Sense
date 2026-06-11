import pytest
import json
from httpx import AsyncClient
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.database import Base, get_db, AsyncSessionLocal
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.orm import sessionmaker
from app.models import Train, Station, DelayPrediction, User, RoleEnum
from app.auth import get_password_hash
import uuid

# Test database
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

@pytest.fixture
async def setup_test_db():
    """Setup test database"""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture
async def client(setup_test_db):
    """Create test client"""
    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user():
    """Create test user"""
    async with TestingSessionLocal() as session:
        user = User(
            id=str(uuid.uuid4()),
            email="testuser@railsense.ai",
            password_hash=get_password_hash("testpass123"),
            full_name="Test User",
            role=RoleEnum.public,
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user

@pytest.fixture
async def test_stations_and_trains():
    """Create test stations and trains"""
    async with TestingSessionLocal() as session:
        # Create stations
        stations = []
        for i, code in enumerate(["NDLS", "HWH", "MMCT"]):
            station = Station(
                id=str(uuid.uuid4()),
                station_code=code,
                station_name=f"Station {code}",
                city="City",
                state="State",
                latitude=20.0 + i,
                longitude=80.0 + i,
                platform_count=10,
                has_cctv=True,
                zone="NR"
            )
            session.add(station)
            stations.append(station)
        
        await session.flush()
        
        # Create trains
        trains = []
        train_data = [
            ("12301", "Rajdhani Express", stations[0].id, stations[1].id, "Rajdhani", 1020),
            ("12951", "Express Train", stations[1].id, stations[2].id, "Express", 1440),
        ]
        
        for num, name, origin, dest, typ, duration in train_data:
            train = Train(
                id=str(uuid.uuid4()),
                train_number=num,
                train_name=name,
                origin_station_id=origin,
                destination_station_id=dest,
                train_type=typ,
                typical_duration_min=duration,
                is_active=True
            )
            session.add(train)
            trains.append(train)
        
        await session.commit()
        return stations, trains

class TestDelayPrediction:
    """Tests for delay prediction endpoint"""
    
    @pytest.mark.asyncio
    async def test_predict_delay_success(self, client, test_user, test_stations_and_trains):
        """Test successful delay prediction"""
        _, trains = test_stations_and_trains
        train_id = trains[0].id
        
        # Get token
        login_response = await client.post(
            "/api/auth/login",
            data={
                "username": "testuser@railsense.ai",
                "password": "testpass123"
            }
        )
        token = login_response.json()["access_token"]
        
        # Predict delay
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": train_id,
                "weather_data": {
                    "condition": "clear",
                    "temperature": 25,
                    "wind_speed_kmh": 15,
                    "precipitation_mm": 0
                },
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "train_number" in data
        assert "predicted_delay_min" in data
        assert "confidence_pct" in data
        assert data["predicted_delay_min"] >= 0
        assert 0 <= data["confidence_pct"] <= 100
        assert "root_causes" in data
        assert "prediction_id" in data
    
    @pytest.mark.asyncio
    async def test_predict_delay_rain_impact(self, client, test_user, test_stations_and_trains):
        """Test that rain increases predicted delay"""
        _, trains = test_stations_and_trains
        
        # Get token
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        # Predict with clear weather
        response1 = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        delay_clear = response1.json()["predicted_delay_min"]
        
        # Predict with rain
        response2 = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "rain", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 10},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        delay_rain = response2.json()["predicted_delay_min"]
        
        # Rain should increase delay
        assert delay_rain > delay_clear
    
    @pytest.mark.asyncio
    async def test_predict_delay_signal_degradation(self, client, test_user, test_stations_and_trains):
        """Test that signal degradation increases delay"""
        _, trains = test_stations_and_trains
        
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        # Normal signal
        response1 = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        delay_normal = response1.json()["predicted_delay_min"]
        
        # Degraded signal
        response2 = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "degraded",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        delay_degraded = response2.json()["predicted_delay_min"]
        
        # Degraded signal should increase delay
        assert delay_degraded > delay_normal
    
    @pytest.mark.asyncio
    async def test_predict_delay_train_not_found(self, client, test_user):
        """Test prediction fails for non-existent train"""
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": str(uuid.uuid4()),  # Non-existent
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_predict_delay_no_auth(self, client, test_stations_and_trains):
        """Test prediction fails without authentication"""
        _, trains = test_stations_and_trains
        
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            }
        )
        
        assert response.status_code == 403  # No auth


class TestCascadeImpact:
    """Tests for cascade impact calculation"""
    
    @pytest.mark.asyncio
    async def test_cascade_impact_calculation(self, client, test_user, test_stations_and_trains):
        """Test cascade impact is calculated for connected trains"""
        stations, trains = test_stations_and_trains
        
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        # Predict for train 1 (NDLS->HWH)
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        # Train 2 starts from train 1's destination (HWH), so cascade impact should be calculated
        assert "cascade_impacts" in data
        assert isinstance(data["cascade_impacts"], list)


class TestPredictionStats:
    """Tests for prediction statistics endpoint"""
    
    @pytest.mark.asyncio
    async def test_get_stats_empty(self, client, test_user):
        """Test getting stats when no predictions exist"""
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        response = await client.get(
            "/api/delay/stats",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["total_predictions"] == 0
        assert "average_delay_min" in data
        assert "average_confidence_pct" in data
    
    @pytest.mark.asyncio
    async def test_get_predictions_by_train(self, client, test_user, test_stations_and_trains):
        """Test getting predictions for a specific train"""
        _, trains = test_stations_and_trains
        train_id = trains[0].id
        
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        # Make a prediction first
        await client.post(
            "/api/delay/predict",
            json={
                "train_id": train_id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Get predictions
        response = await client.get(
            f"/api/delay/predictions/{train_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0


class TestRootCauses:
    """Tests for root cause identification"""
    
    @pytest.mark.asyncio
    async def test_root_cause_rain(self, client, test_user, test_stations_and_trains):
        """Test that rain is identified as root cause"""
        _, trains = test_stations_and_trains
        
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "rain", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 25},
                "signal_status": "normal",
                "congestion_level": 0.5
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        data = response.json()
        root_causes = data["root_causes"]
        assert len(root_causes) > 0
        assert any("rain" in cause.lower() for cause in root_causes)
    
    @pytest.mark.asyncio
    async def test_root_cause_congestion(self, client, test_user, test_stations_and_trains):
        """Test that congestion is identified as root cause"""
        _, trains = test_stations_and_trains
        
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        
        response = await client.post(
            "/api/delay/predict",
            json={
                "train_id": trains[0].id,
                "weather_data": {"condition": "clear", "temperature": 25, "wind_speed_kmh": 15, "precipitation_mm": 0},
                "signal_status": "normal",
                "congestion_level": 0.8  # High congestion
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        data = response.json()
        root_causes = data["root_causes"]
        assert len(root_causes) > 0
        assert any("congestion" in cause.lower() for cause in root_causes)

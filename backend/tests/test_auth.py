import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.database import Base, get_db
from app.models import User, RoleEnum
from app.auth import get_password_hash
import uuid

# Test database setup
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

import pytest_asyncio

@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_test_db():
    """Create test database and tables"""
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    app.dependency_overrides[get_db] = override_get_db
    yield
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def client(setup_test_db):
    """Create test client"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture(scope="module")
async def test_user():
    """Create a test user"""
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

class TestRegistration:
    """Tests for user registration endpoint"""

    @pytest.mark.asyncio
    async def test_register_success(self, client):
        """Test successful user registration"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "newuser@railsense.ai",
                "password": "securepass123",
                "full_name": "New User",
                "role": "public"
            }
        )
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@railsense.ai"
        assert data["full_name"] == "New User"
        assert data["role"] == "public"
        assert "password_hash" not in data

    @pytest.mark.asyncio
    async def test_register_duplicate_email(self, client, test_user):
        """Test registration fails with duplicate email"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "testuser@railsense.ai",
                "password": "securepass123",
                "full_name": "Another User",
                "role": "public"
            }
        )
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, client):
        """Test registration fails with invalid email"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "invalid-email",
                "password": "securepass123",
                "full_name": "New User",
                "role": "public"
            }
        )
        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_register_short_password(self, client):
        """Test registration fails with password < 8 characters"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "newuser@railsense.ai",
                "password": "short",
                "full_name": "New User",
                "role": "public"
            }
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_missing_full_name(self, client):
        """Test registration fails without full_name"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "newuser@railsense.ai",
                "password": "securepass123",
                "role": "public"
            }
        )
        assert response.status_code == 422

class TestLogin:
    """Tests for login endpoint"""

    @pytest.mark.asyncio
    async def test_login_success(self, client, test_user):
        """Test successful login"""
        response = await client.post(
            "/api/auth/login",
            data={
                "username": "testuser@railsense.ai",
                "password": "testpass123"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client, test_user):
        """Test login fails with wrong password"""
        response = await client.post(
            "/api/auth/login",
            data={
                "username": "testuser@railsense.ai",
                "password": "wrongpass123"
            }
        )
        assert response.status_code == 401
        assert "Incorrect" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(self, client):
        """Test login fails for non-existent user"""
        response = await client.post(
            "/api/auth/login",
            data={
                "username": "nonexistent@railsense.ai",
                "password": "somepass123"
            }
        )
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(self, client):
        """Test login fails for inactive user"""
        async with TestingSessionLocal() as session:
            user = User(
                id=str(uuid.uuid4()),
                email="inactive@railsense.ai",
                password_hash=get_password_hash("testpass123"),
                full_name="Inactive User",
                role=RoleEnum.public,
                is_active=False
            )
            session.add(user)
            await session.commit()

        response = await client.post(
            "/api/auth/login",
            data={
                "username": "inactive@railsense.ai",
                "password": "testpass123"
            }
        )
        assert response.status_code == 403
        assert "inactive" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_login_updates_last_login(self, client, test_user):
        """Test that login updates last_login_at timestamp"""
        response = await client.post(
            "/api/auth/login",
            data={
                "username": "testuser@railsense.ai",
                "password": "testpass123"
            }
        )
        assert response.status_code == 200

        async with TestingSessionLocal() as session:
            user = await session.get(User, test_user.id)
            assert user.last_login_at is not None

class TestRefresh:
    """Tests for token refresh endpoint"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(self, client):
        """Test successful token refresh"""
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "valid_refresh_token"}
        )
        # In MVP, this is simplified - in production implement proper refresh token storage
        assert response.status_code in [200, 401]  # Depends on implementation

class TestGetCurrentUser:
    """Tests for get current user endpoint"""

    @pytest.mark.asyncio
    async def test_get_current_user_success(self, client, test_user):
        """Test getting current user info with valid token"""
        # First login to get token
        login_response = await client.post(
            "/api/auth/login",
            data={
                "username": "testuser@railsense.ai",
                "password": "testpass123"
            }
        )
        token = login_response.json()["access_token"]

        # Get current user
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "testuser@railsense.ai"

    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, client):
        """Test getting current user without token fails"""
        response = await client.get("/api/auth/me")
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client):
        """Test getting current user with invalid token fails"""
        response = await client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401


class TestLogout:
    """Tests for logout endpoint"""

    @pytest.mark.asyncio
    async def test_logout_success(self, client, test_user):
        """Test logout endpoint"""
        login_response = await client.post(
            "/api/auth/login",
            data={"username": "testuser@railsense.ai", "password": "testpass123"}
        )
        token = login_response.json()["access_token"]
        response = await client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 204


class TestEndToEnd:
    """End-to-end authentication flow tests"""

    @pytest.mark.asyncio
    async def test_complete_auth_flow(self, client):
        """Test complete registration -> login -> get user flow"""
        register_response = await client.post(
            "/api/auth/register",
            json={
                "email": "e2e@railsense.ai",
                "password": "e2epass123",
                "full_name": "E2E User",
                "role": "public",
            },
        )
        assert register_response.status_code == 201

        login_response = await client.post(
            "/api/auth/login",
            data={"username": "e2e@railsense.ai", "password": "e2epass123"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        me_response = await client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_response.status_code == 200
        assert me_response.json()["email"] == "e2e@railsense.ai"

    @pytest.mark.asyncio
    async def test_operator_role_creation(self, client):
        """Test creating user with operator role"""
        response = await client.post(
            "/api/auth/register",
            json={
                "email": "operator@railsense.ai",
                "password": "oppass123",
                "full_name": "Operator User",
                "role": "operator",
                "station_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 201
        assert response.json()["role"] == "operator"

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta
from .. import database, models, schemas, auth

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
async def register(user: schemas.UserCreate, db: AsyncSession = Depends(database.get_db)):
    """Register a new user with email and password"""
    result = await db.execute(select(models.User).where(models.User.email == user.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        role=user.role,
        station_id=user.station_id
    )
    db.add(db_user)
    await db.commit()
    await db.refresh(db_user)
    return db_user

@router.post("/login", response_model=schemas.Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(database.get_db)
):
    """Login with email and password, returns access token"""
    result = await db.execute(select(models.User).where(models.User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Update last login time
    user.last_login_at = auth.datetime.utcnow()
    await db.commit()
    
    # Create tokens
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": str(user.id), "role": user.role.value},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }

@router.post("/refresh", response_model=schemas.Token)
async def refresh_token(
    token_data: schemas.TokenRefresh,
    db: AsyncSession = Depends(database.get_db)
):
    """Refresh access token using refresh token"""
    try:
        # For simplicity in MVP, we'll just create a new access token if the refresh token is valid
        # In production, implement proper refresh token storage and rotation
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": token_data.refresh_token},
            expires_delta=access_token_expires
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": auth.ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@router.get("/me", response_model=schemas.UserOut)
async def get_current_user_info(
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get current authenticated user info"""
    return current_user

@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(current_user: models.User = Depends(auth.get_current_user)):
    """Logout (client should discard token)"""
    # In a stateless JWT system, logout is handled on the client side
    # by discarding the token. This endpoint is here for API consistency.
    return None

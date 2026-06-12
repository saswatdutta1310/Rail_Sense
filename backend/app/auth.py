import os
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from . import database, models

SECRET_KEY = os.getenv("SECRET_KEY", "supersecretjwtkey")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password):
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(db: AsyncSession = Depends(database.get_db)):
    # Bypassed authentication: always return the superadmin user
    result = await db.execute(
        select(models.User).where(models.User.email == "admin@railsense.ai")
    )
    user = result.scalars().first()
    if not user:
        # Fallback if DB not seeded
        return models.User(
            id="123",
            email="admin@railsense.ai",
            full_name="Admin",
            role=models.RoleEnum.superadmin,
            is_active=True,
        )
    return user


def require_role(allowed_roles: List[str]):
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Operation not permitted"
            )
        return current_user

    return role_checker

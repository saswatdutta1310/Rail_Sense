from pydantic import BaseModel, EmailStr
from typing import Optional
from .models import RoleEnum

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: Optional[RoleEnum] = RoleEnum.public
    station_id: Optional[str] = None

class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: RoleEnum
    station_id: Optional[str]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

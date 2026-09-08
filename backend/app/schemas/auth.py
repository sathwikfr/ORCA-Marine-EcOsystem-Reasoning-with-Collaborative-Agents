"""
backend/app/schemas/auth.py
Pydantic request/response schemas for authentication.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=2)
    role: str = Field("researcher")
    region: Optional[str] = None
    phone: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class UserOut(BaseModel):
    user_id: UUID
    email: str
    full_name: str
    role: str
    region: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class LoginResponse(TokenResponse):
    user: UserOut

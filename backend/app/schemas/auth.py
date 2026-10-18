from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class LoginRequest(BaseModel):
    email: str
    password: str
    code: Optional[str] = Field(default=None, pattern=r"^[0-9]{6}$")

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    requires_otp: bool = False

class OTPRequest(BaseModel):
    email: str

class OTPVerifyRequest(BaseModel):
    email: str
    code: str = Field(pattern=r"^[0-9]{6}$")

class PasswordResetRequest(BaseModel):
    email: str
    code: str = Field(pattern=r"^[0-9]{6}$")
    new_password: str = Field(min_length=12)

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=12)

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    status: str
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True

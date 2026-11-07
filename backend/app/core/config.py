from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./bovet.db"
    SECRET_KEY: Optional[str] = None
    OTP_HMAC_KEY: Optional[str] = None
    ACCESS_TOKEN_MINUTES: int = 720
    REFRESH_IDLE_MINUTES: int = 300
    OTP_EXPIRY_MINUTES: int = 5
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    MAIL_FROM: Optional[str] = None
    BREVO_API_KEY: Optional[str] = None
    
    APP_ORIGIN: str = "http://localhost:5173"
    TZ: str = "Africa/Nairobi"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

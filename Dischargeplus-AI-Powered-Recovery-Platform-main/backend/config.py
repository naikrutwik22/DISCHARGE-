"""
Discharge+ — Configuration
Loads all environment variables via pydantic-settings.
"""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    supabase_jwt_secret: str

    # Groq AI
    groq_api_key: str = ""

    # SMTP
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_name: str = "Discharge+"
    smtp_from_email: str = "noreply@dischargeplus.com"

    # 100ms Video
    hms_access_key: str = ""
    hms_secret: str = ""
    hms_template_id: str = ""

    # App
    app_name: str = "Discharge+"
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    environment: str = "development"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()

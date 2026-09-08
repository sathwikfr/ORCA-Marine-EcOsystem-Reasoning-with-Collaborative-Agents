"""
backend/app/core/config.py
Backend settings loaded from environment variables.
"""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ORCA"
    app_env: str = Field("development", env="APP_ENV")
    debug: bool = Field(True, env="DEBUG")

    # Database
    database_url: str = Field(
        "postgresql+asyncpg://orca_user:orca_pass@postgres:5432/orca_db",
        env="DATABASE_URL",
    )

    # Redis
    redis_url: str = Field("redis://redis:6379/0", env="REDIS_URL")

    # JWT
    secret_key: str = Field("change-me-in-production-please", env="SECRET_KEY")
    jwt_algorithm: str = Field("HS256", env="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, env="JWT_ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, env="JWT_REFRESH_TOKEN_EXPIRE_DAYS")

    # CORS
    allowed_origins: list[str] = Field(
        ["http://localhost:3000", "http://localhost:5173"],
        env="ALLOWED_ORIGINS",
    )

    # Internal communication
    internal_key: str = Field("orca-internal-secret", env="INTERNAL_KEY")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

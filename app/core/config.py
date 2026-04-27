from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "postgres"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    SUPER_ADMIN_EMAIL: str
    SUPER_ADMIN_PASSWORD: str
    TWO_FACTOR_API_KEY: str = ""
    TWO_FACTOR_SENDER_ID: str = "FITNXS"
    FIREBASE_CREDENTIALS_PATH: str = "./firebase-credentials.json"
    REDIS_URL: str = "redis://localhost:6379/0"
    APP_NAME: str = "FitNexus"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    FRONTEND_URL: str = ""
    ALLOWED_ORIGINS: str = "*"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

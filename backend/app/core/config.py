from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(
            str(ROOT_DIR / ".env"),
            str(ROOT_DIR / ".env.local"),
            str(ROOT_DIR / "backend" / ".env"),
        ),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Scrapable API"
    app_version: str = "0.1.0"
    api_prefix: str = "/api"
    backend_host: str = Field(default="127.0.0.1", alias="SCRAPABLE_BACKEND_HOST")
    backend_port: int = Field(default=8000, alias="SCRAPABLE_BACKEND_PORT")
    allowed_origins_raw: str = Field(
        default="http://127.0.0.1:5173,http://localhost:5173",
        alias="SCRAPABLE_ALLOWED_ORIGINS",
    )
    playwright_browser: str = Field(
        default="chromium",
        alias="SCRAPABLE_PLAYWRIGHT_BROWSER",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.allowed_origins_raw.split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    return Settings()

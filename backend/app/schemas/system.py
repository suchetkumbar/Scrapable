from datetime import datetime

from pydantic import BaseModel


class PlaywrightRuntime(BaseModel):
    browser: str
    executable_path: str | None
    installed: bool
    error: str | None = None


class HealthResponse(BaseModel):
    service: str
    status: str
    version: str
    api_prefix: str
    timestamp: datetime
    allowed_origins: list[str]
    playwright: PlaywrightRuntime

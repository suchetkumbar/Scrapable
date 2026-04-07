from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from backend.app.core.config import Settings, get_settings
from backend.app.schemas.system import HealthResponse
from backend.app.services.playwright_runtime import inspect_playwright

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health", response_model=HealthResponse)
async def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    playwright_runtime = inspect_playwright(settings.playwright_browser)

    return HealthResponse(
        service=settings.app_name,
        status="ok",
        version=settings.app_version,
        api_prefix=settings.api_prefix,
        timestamp=datetime.now(timezone.utc),
        allowed_origins=settings.allowed_origins,
        playwright=playwright_runtime,
    )

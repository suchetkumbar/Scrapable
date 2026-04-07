from fastapi import APIRouter, Depends, HTTPException
from fastapi.concurrency import run_in_threadpool

from backend.app.core.config import Settings, get_settings
from backend.app.schemas.scrape import ScrapeRequest, ScrapeResponse
from backend.app.services.scraper import (
    PageFetchError,
    PlaywrightUnavailableError,
    RobotsBlockedError,
    ScrapeTimeoutError,
    scrape_page,
)

router = APIRouter(prefix="/scrape", tags=["scrape"])


@router.post("", response_model=ScrapeResponse)
async def scrape_target(
    request: ScrapeRequest,
    settings: Settings = Depends(get_settings),
) -> ScrapeResponse:
    try:
        return await run_in_threadpool(
            scrape_page,
            request,
            settings.playwright_browser,
        )
    except RobotsBlockedError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ScrapeTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except PlaywrightUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except PageFetchError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc

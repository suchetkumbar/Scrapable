import logging

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from backend.app.core.config import Settings, get_settings
from backend.app.schemas.scrape import (
    ScrapeJobStatusResponse,
    ScrapeRequest,
    ScrapeResponse,
)
from backend.app.services.scrape_jobs import job_manager
from backend.app.services.scraper import (
    BlockedAccessError,
    PageFetchError,
    PlaywrightUnavailableError,
    RobotsBlockedError,
    ScrapeTimeoutError,
    scrape_page,
)

router = APIRouter(prefix="/scrape", tags=["scrape"])
logger = logging.getLogger(__name__)


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
    except BlockedAccessError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except PageFetchError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected scrape failure for %s", request.url)
        detail = str(exc).strip() or exc.__class__.__name__
        raise HTTPException(status_code=500, detail=f"Unexpected scrape failure: {detail}") from exc


@router.post(
    "/jobs",
    response_model=ScrapeJobStatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
async def create_scrape_job(
    request: ScrapeRequest,
    settings: Settings = Depends(get_settings),
) -> ScrapeJobStatusResponse:
    return job_manager.create_job(request, settings.playwright_browser)


@router.get("/jobs/{job_id}", response_model=ScrapeJobStatusResponse)
async def get_scrape_job(job_id: str) -> ScrapeJobStatusResponse:
    try:
        return job_manager.get_job(job_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Scrape job was not found.") from exc

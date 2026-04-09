from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock, Thread
from typing import Any
from uuid import uuid4

from backend.app.schemas.scrape import ScrapeJobStatusResponse, ScrapeRequest, ScrapeResponse
from backend.app.services.scraper import scrape_page


@dataclass
class InternalScrapeJob:
    job_id: str
    mode: str
    pages_target: int
    state: str = "queued"
    progress: int = 0
    stage: str = "Queued scrape job."
    pages_completed: int = 0
    error: str | None = None
    result: ScrapeResponse | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class ScrapeJobManager:
    def __init__(self) -> None:
        self._lock = Lock()
        self._jobs: dict[str, InternalScrapeJob] = {}

    def create_job(self, request: ScrapeRequest, browser_name: str) -> ScrapeJobStatusResponse:
        job = InternalScrapeJob(
            job_id=str(uuid4()),
            mode=request.pagination_mode,
            pages_target=_target_pages(request),
        )
        with self._lock:
            self._jobs[job.job_id] = job
            self._prune_jobs()

        worker = Thread(
            target=self._run_job,
            args=(job.job_id, request, browser_name),
            daemon=True,
            name=f"scrape-job-{job.job_id[:8]}",
        )
        worker.start()
        return self.get_job(job.job_id)

    def get_job(self, job_id: str) -> ScrapeJobStatusResponse:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise KeyError(job_id)
            return self._snapshot(job)

    def _run_job(self, job_id: str, request: ScrapeRequest, browser_name: str) -> None:
        self._update(
            job_id,
            state="running",
            progress=3,
            stage="Starting pagination scrape...",
            pages_completed=0,
            error=None,
            result=None,
        )

        try:
            result = scrape_page(
                request,
                browser_name,
                progress_callback=lambda stage, progress, pages_completed, pages_target: self._update(
                    job_id,
                    state="running",
                    progress=progress,
                    stage=stage,
                    pages_completed=pages_completed,
                    pages_target=pages_target,
                ),
            )
            self._update(
                job_id,
                state="completed",
                progress=100,
                stage="Pagination scrape complete.",
                pages_completed=result.pagination.pages_scraped,
                pages_target=max(result.pagination.pages_requested, 1),
                result=result,
                error=None,
            )
        except Exception as exc:
            self._update(
                job_id,
                state="failed",
                progress=100,
                stage="Pagination scrape failed.",
                error=str(exc).strip() or exc.__class__.__name__,
            )

    def _update(self, job_id: str, **changes: Any) -> None:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                return
            for key, value in changes.items():
                setattr(job, key, value)
            job.updated_at = datetime.now(timezone.utc)

    def _snapshot(self, job: InternalScrapeJob) -> ScrapeJobStatusResponse:
        return ScrapeJobStatusResponse(
            job_id=job.job_id,
            state=job.state,
            progress=job.progress,
            stage=job.stage,
            mode=job.mode,
            pages_completed=job.pages_completed,
            pages_target=max(job.pages_target, 1),
            error=job.error,
            result=job.result,
            created_at=job.created_at,
            updated_at=job.updated_at,
        )

    def _prune_jobs(self) -> None:
        if len(self._jobs) <= 40:
            return

        ordered = sorted(self._jobs.values(), key=lambda job: job.updated_at)
        for job in ordered[: max(len(self._jobs) - 30, 0)]:
            if job.state in {"completed", "failed"}:
                self._jobs.pop(job.job_id, None)


def _target_pages(request: ScrapeRequest) -> int:
    if request.pagination_mode == "current":
        return 1
    if request.pagination_mode == "next":
        return 2
    return max(request.page_limit, 1)


job_manager = ScrapeJobManager()

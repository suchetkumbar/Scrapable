from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, HttpUrl


class ScrapeRequest(BaseModel):
    url: HttpUrl
    timeout_ms: int = Field(default=30000, ge=5000, le=120000)
    render_delay_ms: int = Field(default=1200, ge=0, le=10000)
    max_items: int = Field(default=80, ge=10, le=250)
    pagination_mode: Literal["current", "next", "all"] = "current"
    page_limit: int = Field(default=3, ge=1, le=10)
    enable_infinite_scroll: bool = True


class ScrapedImage(BaseModel):
    src: str
    alt: str


class ScrapedLink(BaseModel):
    href: str
    text: str


class ScrapedMeta(BaseModel):
    key: str
    value: str


class ScrapedTable(BaseModel):
    caption: str | None = None
    rows: list[list[str]]


class RobotsReport(BaseModel):
    url: str
    allowed: bool
    status: str


class ClassificationAlternative(BaseModel):
    key: str
    label: str
    confidence: float = Field(ge=0, le=1)


class ClassificationReport(BaseModel):
    key: str
    label: str
    confidence: float = Field(ge=0, le=1)
    heuristic_score: float = Field(ge=0)
    semantic_score: float = Field(ge=0)
    rationale: list[str]
    alternatives: list[ClassificationAlternative]


class PaginationCandidate(BaseModel):
    kind: Literal["next", "numbered", "load_more"]
    label: str
    href: str | None = None
    selector: str | None = None
    page_number: int | None = None
    current: bool = False
    disabled: bool = False


class PaginationPageSummary(BaseModel):
    page_number: int
    url: str
    final_url: str
    title: str
    status_code: int | None
    headings: int
    paragraphs: int
    images: int
    links: int
    tables: int


class PaginationReport(BaseModel):
    mode: Literal["current", "next", "all"]
    strategy: str
    page_limit: int
    pages_requested: int
    pages_scraped: int
    has_pagination: bool
    supports_infinite_scroll: bool
    next_url: str | None = None
    stopped_reason: str | None = None
    visited_urls: list[str]
    candidates: list[PaginationCandidate]
    page_summaries: list[PaginationPageSummary]


class ScrapeResponse(BaseModel):
    url: str
    final_url: str
    title: str
    description: str
    headings: list[str]
    paragraphs: list[str]
    images: list[ScrapedImage]
    links: list[ScrapedLink]
    tables: list[ScrapedTable]
    meta: list[ScrapedMeta]
    status_code: int | None
    robots: RobotsReport
    classification: ClassificationReport
    pagination: PaginationReport
    scraped_at: datetime


class ScrapeJobStatusResponse(BaseModel):
    job_id: str
    state: Literal["queued", "running", "completed", "failed"]
    progress: int = Field(ge=0, le=100)
    stage: str
    mode: Literal["current", "next", "all"]
    pages_completed: int = Field(ge=0)
    pages_target: int = Field(ge=1)
    error: str | None = None
    result: ScrapeResponse | None = None
    created_at: datetime
    updated_at: datetime

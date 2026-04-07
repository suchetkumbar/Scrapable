from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class ScrapeRequest(BaseModel):
    url: HttpUrl
    timeout_ms: int = Field(default=30000, ge=5000, le=120000)
    render_delay_ms: int = Field(default=1200, ge=0, le=10000)
    max_items: int = Field(default=80, ge=10, le=250)


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
    scraped_at: datetime

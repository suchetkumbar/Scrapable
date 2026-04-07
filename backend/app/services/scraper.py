from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urldefrag

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from backend.app.schemas.scrape import (
    RobotsReport,
    ScrapeRequest,
    ScrapeResponse,
    ScrapedImage,
    ScrapedLink,
    ScrapedMeta,
    ScrapedTable,
)
from backend.app.services.robots import RobotsCheckResult, check_robots_allowed

EXTRACTION_SCRIPT = """
() => {
  const clean = (value) => (value || "").replace(/\\s+/g, " ").trim();
  const toAbsolute = (value) => {
    if (!value) return "";
    try {
      return new URL(value, document.baseURI).href;
    } catch {
      return "";
    }
  };

  const meta = Array.from(document.querySelectorAll("meta[name], meta[property]"))
    .map((element) => ({
      key: clean(element.getAttribute("name") || element.getAttribute("property") || ""),
      value: clean(element.getAttribute("content") || ""),
    }))
    .filter((entry) => entry.key && entry.value);

  const findMeta = (...keys) => {
    const lowered = keys.map((key) => key.toLowerCase());
    const entry = meta.find((item) => lowered.includes(item.key.toLowerCase()));
    return entry ? entry.value : "";
  };

  const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"))
    .map((element) => clean(element.textContent))
    .filter(Boolean);

  const paragraphs = Array.from(document.querySelectorAll("main p, article p, section p, p"))
    .map((element) => clean(element.textContent))
    .filter(Boolean);

  const links = Array.from(document.querySelectorAll("a[href]"))
    .map((element) => ({
      href: toAbsolute(element.getAttribute("href") || ""),
      text: clean(element.textContent || element.getAttribute("aria-label") || element.getAttribute("title") || ""),
    }))
    .filter((link) => link.href);

  const images = Array.from(document.querySelectorAll("img"))
    .map((element) => ({
      src: toAbsolute(element.currentSrc || element.getAttribute("src") || ""),
      alt: clean(element.getAttribute("alt") || ""),
    }))
    .filter((image) => image.src);

  const tables = Array.from(document.querySelectorAll("table"))
    .map((table) => ({
      caption: clean(table.querySelector("caption")?.textContent || ""),
      rows: Array.from(table.querySelectorAll("tr"))
        .map((row) =>
          Array.from(row.querySelectorAll("th, td"))
            .map((cell) => clean(cell.textContent))
            .filter(Boolean)
        )
        .filter((row) => row.length > 0),
    }))
    .filter((table) => table.rows.length > 0);

  return {
    title: clean(document.title),
    description: findMeta("description", "og:description", "twitter:description"),
    headings,
    paragraphs,
    links,
    images,
    tables,
    meta,
  };
}
"""


@dataclass
class ScraperError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


@dataclass
class RobotsBlockedError(ScraperError):
    robots: RobotsCheckResult


@dataclass
class PageFetchError(ScraperError):
    status_code: int


class ScrapeTimeoutError(ScraperError):
    pass


class PlaywrightUnavailableError(ScraperError):
    pass


def scrape_page(request: ScrapeRequest, browser_name: str) -> ScrapeResponse:
    target_url = urldefrag(str(request.url)).url
    robots = check_robots_allowed(target_url)

    if not robots.allowed:
        raise RobotsBlockedError(
            message=f"robots.txt disallows scraping for {target_url}",
            robots=robots,
        )

    browser = None
    context = None

    try:
        with sync_playwright() as playwright:
            browser_type = getattr(playwright, browser_name, None)
            if browser_type is None:
                raise PlaywrightUnavailableError(
                    f"Unsupported Playwright browser '{browser_name}'."
                )

            browser = browser_type.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 960})
            page = context.new_page()
            page.set_default_timeout(request.timeout_ms)
            page.set_default_navigation_timeout(request.timeout_ms)

            try:
                response = page.goto(target_url, wait_until="domcontentloaded")
                try:
                    page.wait_for_load_state(
                        "networkidle",
                        timeout=min(request.timeout_ms, 10000),
                    )
                except PlaywrightTimeoutError:
                    pass

                if request.render_delay_ms:
                    page.wait_for_timeout(request.render_delay_ms)
            except PlaywrightTimeoutError as exc:
                raise ScrapeTimeoutError(
                    f"Timed out while loading {target_url}."
                ) from exc

            status_code = response.status if response else None
            if status_code and status_code >= 400:
                raise PageFetchError(
                    message=f"Target page responded with status {status_code}.",
                    status_code=status_code,
                )

            raw_result = page.evaluate(EXTRACTION_SCRIPT)
            final_url = page.url
    except PlaywrightUnavailableError:
        raise
    except PageFetchError:
        raise
    except ScrapeTimeoutError:
        raise
    except PlaywrightError as exc:
        raise PlaywrightUnavailableError(
            "Playwright could not launch a browser. Run 'npm run setup:playwright' and retry."
        ) from exc
    finally:
        if context is not None:
            context.close()
        if browser is not None:
            browser.close()

    return ScrapeResponse(
        url=target_url,
        final_url=final_url,
        title=_resolve_title(raw_result, final_url),
        description=_resolve_description(raw_result),
        headings=_dedupe_texts(raw_result.get("headings", []), request.max_items, 2),
        paragraphs=_dedupe_texts(raw_result.get("paragraphs", []), request.max_items, 30),
        images=_normalize_images(raw_result.get("images", []), request.max_items),
        links=_normalize_links(raw_result.get("links", []), request.max_items),
        tables=_normalize_tables(raw_result.get("tables", [])),
        meta=_normalize_meta(raw_result.get("meta", []), robots, status_code),
        status_code=status_code,
        robots=RobotsReport(
            url=robots.url,
            allowed=robots.allowed,
            status=robots.status,
        ),
        scraped_at=datetime.now(timezone.utc),
    )


def _resolve_title(raw_result: dict[str, Any], final_url: str) -> str:
    title = _clean_text(raw_result.get("title", ""))
    if title:
        return title

    headings = _dedupe_texts(raw_result.get("headings", []), 1, 2)
    if headings:
        return headings[0]

    return final_url


def _resolve_description(raw_result: dict[str, Any]) -> str:
    description = _clean_text(raw_result.get("description", ""))
    if description:
        return description

    paragraphs = _dedupe_texts(raw_result.get("paragraphs", []), 1, 30)
    if paragraphs:
        return paragraphs[0]

    return "No description was found on the page."


def _normalize_images(items: list[dict[str, Any]], limit: int) -> list[ScrapedImage]:
    seen: set[tuple[str, str]] = set()
    results: list[ScrapedImage] = []

    for item in items:
        src = _clean_text(item.get("src", ""))
        alt = _clean_text(item.get("alt", ""))
        if not src:
            continue

        key = (src, alt)
        if key in seen:
            continue

        seen.add(key)
        results.append(ScrapedImage(src=src, alt=alt))
        if len(results) >= limit:
            break

    return results


def _normalize_links(items: list[dict[str, Any]], limit: int) -> list[ScrapedLink]:
    seen: set[tuple[str, str]] = set()
    results: list[ScrapedLink] = []

    for item in items:
        href = _clean_text(item.get("href", ""))
        text = _clean_text(item.get("text", "")) or href

        if not href.startswith(("http://", "https://")):
            continue

        key = (href, text)
        if key in seen:
            continue

        seen.add(key)
        results.append(ScrapedLink(href=href, text=text))
        if len(results) >= limit:
            break

    return results


def _normalize_tables(items: list[dict[str, Any]]) -> list[ScrapedTable]:
    tables: list[ScrapedTable] = []

    for item in items[:5]:
        rows = [
            [_clean_text(cell, 200) for cell in row if _clean_text(cell, 200)]
            for row in item.get("rows", [])[:25]
        ]
        rows = [row for row in rows if row]
        if not rows:
            continue

        tables.append(
            ScrapedTable(
                caption=_clean_text(item.get("caption", "")) or None,
                rows=rows,
            )
        )

    return tables


def _normalize_meta(
    items: list[dict[str, Any]],
    robots: RobotsCheckResult,
    status_code: int | None,
) -> list[ScrapedMeta]:
    seen: set[tuple[str, str]] = set()
    meta_items: list[ScrapedMeta] = []

    for item in items:
        key = _clean_text(item.get("key", ""), 80)
        value = _clean_text(item.get("value", ""), 300)
        if not key or not value:
            continue

        pair = (key, value)
        if pair in seen:
            continue

        seen.add(pair)
        meta_items.append(ScrapedMeta(key=key, value=value))
        if len(meta_items) >= 40:
            break

    meta_items.extend(
        [
            ScrapedMeta(key="robots:url", value=robots.url),
            ScrapedMeta(key="robots:status", value=robots.status),
            ScrapedMeta(
                key="response:status",
                value=str(status_code) if status_code is not None else "unknown",
            ),
        ]
    )

    return meta_items


def _dedupe_texts(items: list[Any], limit: int, min_length: int) -> list[str]:
    seen: set[str] = set()
    results: list[str] = []

    for item in items:
        text = _clean_text(item)
        if len(text) < min_length or text in seen:
            continue

        seen.add(text)
        results.append(text)
        if len(results) >= limit:
            break

    return results


def _clean_text(value: Any, max_length: int = 400) -> str:
    text = " ".join(str(value or "").split())
    if not text:
        return ""

    return text[:max_length]

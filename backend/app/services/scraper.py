from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable
from urllib.parse import urldefrag

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

from backend.app.schemas.scrape import (
    PaginationCandidate,
    PaginationPageSummary,
    PaginationReport,
    RobotsReport,
    ScrapeRequest,
    ScrapeResponse,
    ScrapedImage,
    ScrapedLink,
    ScrapedMeta,
    ScrapedTable,
)
from backend.app.services.categorizer import classify_scrape
from backend.app.services.extraction_script import EXTRACTION_SCRIPT
from backend.app.services.playwright_runtime import inspect_playwright
from backend.app.services.robots import RobotsCheckResult, check_robots_allowed

ProgressCallback = Callable[[str, int, int, int], None]


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


@dataclass
class BlockedAccessError(ScraperError):
    status_code: int


class ScrapeTimeoutError(ScraperError):
    pass


class PlaywrightUnavailableError(ScraperError):
    pass


@dataclass
class PageSnapshot:
    page_number: int
    url: str
    final_url: str
    status_code: int | None
    robots: RobotsCheckResult
    title: str
    description: str
    headings: list[str]
    paragraphs: list[str]
    images: list[ScrapedImage]
    links: list[ScrapedLink]
    tables: list[ScrapedTable]
    meta: list[ScrapedMeta]
    raw_result: dict[str, Any]
    pagination_candidates: list[PaginationCandidate]
    next_url: str | None
    has_pagination: bool
    supports_infinite_scroll: bool


def scrape_page(
    request: ScrapeRequest,
    browser_name: str,
    progress_callback: ProgressCallback | None = None,
) -> ScrapeResponse:
    target_url = _normalize_url(str(request.url))
    runtime = inspect_playwright(browser_name)
    if not runtime.installed:
        raise PlaywrightUnavailableError(
            runtime.error or "Playwright browser binaries are not installed."
        )

    pages_requested = _requested_page_target(request)
    page_snapshots: list[PageSnapshot] = []
    aggregated_candidates: list[PaginationCandidate] = []
    visited_urls: list[str] = []
    visited_lookup: set[str] = set()
    next_url: str | None = target_url
    has_pagination = False
    supports_infinite_scroll = False
    strategy = "single_page"
    stopped_reason: str | None = None
    first_robots: RobotsCheckResult | None = None

    def report(stage: str, progress: int, pages_completed: int) -> None:
        if progress_callback is not None:
            progress_callback(stage, max(0, min(progress, 100)), pages_completed, pages_requested)

    report("Preparing pagination scrape job...", 4, 0)

    browser = None
    context = None

    try:
        with sync_playwright() as playwright:
            browser_type = getattr(playwright, browser_name, None)
            if browser_type is None:
                raise PlaywrightUnavailableError(
                    f"Unsupported Playwright browser '{browser_name}'."
                )

            report("Launching browser...", 10, 0)
            browser = browser_type.launch(headless=True)
            context = browser.new_context(viewport={"width": 1440, "height": 960})
            page = context.new_page()
            page.set_default_timeout(request.timeout_ms)
            page.set_default_navigation_timeout(request.timeout_ms)

            for page_number in range(1, pages_requested + 1):
                current_url = _normalize_url(next_url or target_url)
                if current_url in visited_lookup:
                    stopped_reason = "Detected a pagination loop, so the scrape stopped safely."
                    break

                try:
                    snapshot = _capture_snapshot(
                        page=page,
                        request=request,
                        url=current_url,
                        page_number=page_number,
                        pages_requested=pages_requested,
                        report=report,
                    )
                except RobotsBlockedError as exc:
                    if page_number == 1:
                        raise
                    stopped_reason = str(exc)
                    break
                except (BlockedAccessError, PageFetchError, ScrapeTimeoutError) as exc:
                    if page_number == 1:
                        raise
                    stopped_reason = str(exc)
                    break

                if first_robots is None:
                    first_robots = snapshot.robots

                page_snapshots.append(snapshot)
                visited_urls.append(snapshot.final_url)
                visited_lookup.add(snapshot.final_url)
                visited_lookup.add(snapshot.url)
                has_pagination = has_pagination or snapshot.has_pagination
                supports_infinite_scroll = (
                    supports_infinite_scroll or snapshot.supports_infinite_scroll
                )
                aggregated_candidates = _merge_pagination_candidates(
                    aggregated_candidates,
                    snapshot.pagination_candidates,
                )

                report(
                    f"Captured page {len(page_snapshots)} of up to {pages_requested}.",
                    _page_progress(page_number, pages_requested, 0.9),
                    len(page_snapshots),
                )

                if request.pagination_mode == "current" or page_number >= pages_requested:
                    break

                candidate = _select_next_candidate(
                    snapshot.pagination_candidates,
                    visited_lookup,
                )
                if candidate is None or not candidate.href:
                    if snapshot.supports_infinite_scroll:
                        strategy = "infinite_scroll"
                        stopped_reason = (
                            "Loaded all available content on the current scrolling surface."
                        )
                    else:
                        stopped_reason = "No further pagination targets were detected."
                    break

                next_url = candidate.href
                strategy = (
                    "multi_page_navigation"
                    if request.pagination_mode == "all"
                    else "next_navigation"
                )

            if not page_snapshots:
                raise ScrapeTimeoutError("No page content was captured during the scrape.")

    except PlaywrightUnavailableError:
        raise
    except BlockedAccessError:
        raise
    except PageFetchError:
        raise
    except ScrapeTimeoutError:
        raise
    except (PlaywrightError, OSError) as exc:
        raise PlaywrightUnavailableError(
            "Playwright could not launch a browser. Confirm 'npm run setup:playwright' completed and restart the backend."
        ) from exc
    finally:
        if context is not None:
            try:
                context.close()
            except Exception:
                pass
        if browser is not None:
            try:
                browser.close()
            except Exception:
                pass

    report("Aggregating pagination results...", 94, len(page_snapshots))
    aggregated = _aggregate_snapshots(
        page_snapshots=page_snapshots,
        request=request,
        has_pagination=has_pagination,
        supports_infinite_scroll=supports_infinite_scroll,
        strategy=strategy,
        stopped_reason=stopped_reason,
        candidates=aggregated_candidates,
        visited_urls=visited_urls,
        pages_requested=pages_requested,
        robots=first_robots or page_snapshots[0].robots,
    )
    report("Pagination scrape complete.", 100, aggregated.pagination.pages_scraped)
    return aggregated


def _capture_snapshot(
    *,
    page: Page,
    request: ScrapeRequest,
    url: str,
    page_number: int,
    pages_requested: int,
    report: Callable[[str, int, int], None],
) -> PageSnapshot:
    report(
        f"Checking robots.txt for page {page_number}...",
        _page_progress(page_number, pages_requested, 0.1),
        page_number - 1,
    )
    robots = check_robots_allowed(url)
    if not robots.allowed:
        raise RobotsBlockedError(
            message=f"robots.txt disallows scraping for {url}",
            robots=robots,
        )

    report(
        f"Rendering page {page_number}...",
        _page_progress(page_number, pages_requested, 0.28),
        page_number - 1,
    )
    try:
        response = page.goto(url, wait_until="domcontentloaded")
        _wait_for_page(page, request)
    except PlaywrightTimeoutError as exc:
        raise ScrapeTimeoutError(f"Timed out while loading {url}.") from exc

    status_code = response.status if response else None
    if status_code in {401, 403, 429}:
        raise BlockedAccessError(
            message=f"Access was blocked by the target website (HTTP {status_code}).",
            status_code=status_code,
        )
    if status_code and status_code >= 400:
        raise PageFetchError(
            message=f"Target page responded with status {status_code}.",
            status_code=status_code,
        )

    if request.enable_infinite_scroll:
        report(
            f"Handling infinite scroll on page {page_number}...",
            _page_progress(page_number, pages_requested, 0.46),
            page_number - 1,
        )
        _expand_infinite_scroll(page, request)

    report(
        f"Extracting page {page_number}...",
        _page_progress(page_number, pages_requested, 0.72),
        page_number - 1,
    )
    extracted = page.evaluate(EXTRACTION_SCRIPT)
    raw_result = extracted if isinstance(extracted, dict) else {}
    final_url = _normalize_url(page.url or url)
    title = _resolve_title(raw_result, final_url)
    description = _resolve_description(raw_result)
    headings = _dedupe_texts(raw_result.get("headings", []), request.max_items, 2)
    paragraphs = _dedupe_texts(raw_result.get("paragraphs", []), request.max_items, 30)
    images = _normalize_images(raw_result.get("images", []), request.max_items)
    links = _normalize_links(raw_result.get("links", []), request.max_items)
    tables = _normalize_tables(raw_result.get("tables", []))
    meta = _normalize_meta(raw_result.get("meta", []), robots, status_code)
    pagination_info = raw_result.get("pagination", {})
    pagination_candidates = _normalize_pagination_candidates(
        pagination_info.get("candidates", [])
    )

    return PageSnapshot(
        page_number=page_number,
        url=url,
        final_url=final_url,
        status_code=status_code,
        robots=robots,
        title=title,
        description=description,
        headings=headings,
        paragraphs=paragraphs,
        images=images,
        links=links,
        tables=tables,
        meta=meta,
        raw_result=raw_result,
        pagination_candidates=pagination_candidates,
        next_url=_clean_text(pagination_info.get("nextUrl", "")) or None,
        has_pagination=bool(pagination_info.get("hasPagination")) or bool(pagination_candidates),
        supports_infinite_scroll=bool(pagination_info.get("supportsInfiniteScroll")),
    )


def _aggregate_snapshots(
    *,
    page_snapshots: list[PageSnapshot],
    request: ScrapeRequest,
    has_pagination: bool,
    supports_infinite_scroll: bool,
    strategy: str,
    stopped_reason: str | None,
    candidates: list[PaginationCandidate],
    visited_urls: list[str],
    pages_requested: int,
    robots: RobotsCheckResult,
) -> ScrapeResponse:
    item_limit = min(request.max_items * max(len(page_snapshots), 1), 400)
    title = page_snapshots[0].title
    if len(page_snapshots) > 1:
        title = f"{title} (+{len(page_snapshots) - 1} pages)"

    description = page_snapshots[0].description
    headings = _aggregate_text_lists(
        [snapshot.headings for snapshot in page_snapshots],
        limit=item_limit,
        min_length=2,
    )
    paragraphs = _aggregate_text_lists(
        [snapshot.paragraphs for snapshot in page_snapshots],
        limit=item_limit,
        min_length=30,
    )
    images = _aggregate_images([snapshot.images for snapshot in page_snapshots], item_limit)
    links = _aggregate_links([snapshot.links for snapshot in page_snapshots], item_limit)
    tables = _aggregate_tables([snapshot.tables for snapshot in page_snapshots], 8)
    meta = _aggregate_meta([snapshot.meta for snapshot in page_snapshots])
    meta.append(ScrapedMeta(key="pagination:pages_scraped", value=str(len(page_snapshots))))
    meta.append(ScrapedMeta(key="pagination:mode", value=request.pagination_mode))

    combined_raw_result = _combine_raw_results(page_snapshots)
    classification = classify_scrape(
        url=page_snapshots[0].url,
        final_url=page_snapshots[-1].final_url,
        title=title,
        description=description,
        headings=headings,
        paragraphs=paragraphs,
        images=images,
        links=links,
        tables=tables,
        meta=meta,
        raw_result=combined_raw_result,
    )

    pagination = PaginationReport(
        mode=request.pagination_mode,
        strategy=strategy,
        page_limit=request.page_limit,
        pages_requested=pages_requested,
        pages_scraped=len(page_snapshots),
        has_pagination=has_pagination or len(page_snapshots) > 1,
        supports_infinite_scroll=supports_infinite_scroll,
        next_url=page_snapshots[-1].next_url,
        stopped_reason=stopped_reason,
        visited_urls=visited_urls,
        candidates=candidates[:12],
        page_summaries=[
            PaginationPageSummary(
                page_number=snapshot.page_number,
                url=snapshot.url,
                final_url=snapshot.final_url,
                title=snapshot.title,
                status_code=snapshot.status_code,
                headings=len(snapshot.headings),
                paragraphs=len(snapshot.paragraphs),
                images=len(snapshot.images),
                links=len(snapshot.links),
                tables=len(snapshot.tables),
            )
            for snapshot in page_snapshots
        ],
    )

    return ScrapeResponse(
        url=page_snapshots[0].url,
        final_url=page_snapshots[-1].final_url,
        title=title,
        description=description,
        headings=headings,
        paragraphs=paragraphs,
        images=images,
        links=links,
        tables=tables,
        meta=meta,
        status_code=page_snapshots[0].status_code,
        robots=RobotsReport(
            url=robots.url,
            allowed=robots.allowed,
            status=robots.status,
        ),
        classification=classification,
        pagination=pagination,
        scraped_at=datetime.now(timezone.utc),
    )


def _wait_for_page(page: Page, request: ScrapeRequest) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=min(request.timeout_ms, 10000))
    except PlaywrightTimeoutError:
        pass

    if request.render_delay_ms:
        page.wait_for_timeout(request.render_delay_ms)


def _expand_infinite_scroll(page: Page, request: ScrapeRequest) -> None:
    max_rounds = min(max(request.page_limit * 2, 4), 10)
    stable_rounds = 0
    previous_height = 0

    for _ in range(max_rounds):
        clicked_more = bool(
            page.evaluate(
                """
                () => {
                  const terms = ["load more", "show more", "see more", "view more", "more results"];
                  const elements = Array.from(document.querySelectorAll("button, a"));
                  for (const element of elements) {
                    const label = (element.innerText || element.textContent || element.getAttribute("aria-label") || "")
                      .replace(/\\s+/g, " ")
                      .trim()
                      .toLowerCase();
                    if (!label) continue;

                    const style = window.getComputedStyle(element);
                    const visible = style.display !== "none" && style.visibility !== "hidden";
                    const disabled =
                      element.matches(":disabled") || element.getAttribute("aria-disabled") === "true";
                    if (!visible || disabled) continue;

                    if (terms.some((term) => label.includes(term))) {
                      element.click();
                      return true;
                    }
                  }
                  return false;
                }
                """
            )
        )

        current_height = int(
            page.evaluate(
                "() => Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0)"
            )
        )
        page.evaluate(
            "() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' })"
        )
        page.wait_for_timeout(max(350, min(request.render_delay_ms, 1200)))
        new_height = int(
            page.evaluate(
                "() => Math.max(document.body.scrollHeight || 0, document.documentElement.scrollHeight || 0)"
            )
        )

        if new_height <= previous_height and not clicked_more:
            stable_rounds += 1
        else:
            stable_rounds = 0

        previous_height = max(current_height, new_height)
        if stable_rounds >= 2:
            break


def _normalize_pagination_candidates(items: list[dict[str, Any]]) -> list[PaginationCandidate]:
    candidates: list[PaginationCandidate] = []
    seen: set[tuple[str, str, str]] = set()

    for item in items:
        kind = _clean_text(item.get("kind", "")).lower()
        if kind not in {"next", "numbered", "load_more"}:
            continue

        label = _clean_text(item.get("label", ""), 120) or kind.replace("_", " ").title()
        href = _normalize_url(_clean_text(item.get("href", ""))) or None
        selector = _clean_text(item.get("selector", ""), 240) or None
        page_number = item.get("pageNumber")
        if not isinstance(page_number, int):
            try:
                page_number = int(page_number)
            except (TypeError, ValueError):
                page_number = None

        key = (kind, href or "", label)
        if key in seen:
            continue
        seen.add(key)

        candidates.append(
            PaginationCandidate(
                kind=kind,
                label=label,
                href=href,
                selector=selector,
                page_number=page_number,
                current=bool(item.get("current")),
                disabled=bool(item.get("disabled")),
            )
        )

        if len(candidates) >= 12:
            break

    return candidates


def _merge_pagination_candidates(
    existing: list[PaginationCandidate],
    incoming: list[PaginationCandidate],
) -> list[PaginationCandidate]:
    merged = list(existing)
    seen = {(item.kind, item.href or "", item.label) for item in merged}

    for item in incoming:
        key = (item.kind, item.href or "", item.label)
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)
        if len(merged) >= 12:
            break

    return merged


def _select_next_candidate(
    candidates: list[PaginationCandidate],
    visited_lookup: set[str],
) -> PaginationCandidate | None:
    next_candidates = [
        candidate
        for candidate in candidates
        if candidate.kind == "next"
        and not candidate.disabled
        and candidate.href
        and candidate.href not in visited_lookup
    ]
    if next_candidates:
        return next_candidates[0]

    current_page_number = max(
        (
            candidate.page_number or 0
            for candidate in candidates
            if candidate.kind == "numbered" and candidate.current
        ),
        default=0,
    )
    numbered_candidates = sorted(
        (
            candidate
            for candidate in candidates
            if candidate.kind == "numbered"
            and not candidate.disabled
            and candidate.href
            and candidate.href not in visited_lookup
            and (candidate.page_number or 0) > current_page_number
        ),
        key=lambda item: item.page_number or 0,
    )
    if numbered_candidates:
        return numbered_candidates[0]

    return None


def _requested_page_target(request: ScrapeRequest) -> int:
    if request.pagination_mode == "current":
        return 1
    if request.pagination_mode == "next":
        return 2
    return max(request.page_limit, 1)


def _page_progress(page_number: int, pages_requested: int, page_fraction: float) -> int:
    total_pages = max(pages_requested, 1)
    base = 10 + ((page_number - 1) / total_pages) * 78
    current = base + (78 / total_pages) * max(0.0, min(page_fraction, 1.0))
    return int(min(current, 96))


def _combine_raw_results(page_snapshots: list[PageSnapshot]) -> dict[str, Any]:
    schema_types: list[str] = []
    seen_schema_types: set[str] = set()
    counts = {
        "articleCount": 0,
        "codeBlockCount": 0,
        "formCount": 0,
        "navLinkCount": 0,
        "timeCount": 0,
        "videoEmbedCount": 0,
        "priceMentionCount": 0,
    }

    for snapshot in page_snapshots:
        analysis = snapshot.raw_result.get("analysis", {})
        for item in analysis.get("schemaTypes", []):
            normalized = _clean_text(item)
            if normalized and normalized not in seen_schema_types:
                seen_schema_types.add(normalized)
                schema_types.append(normalized)

        raw_counts = analysis.get("counts", {})
        for key in counts:
            try:
                counts[key] += max(int(raw_counts.get(key, 0)), 0)
            except (TypeError, ValueError):
                continue

    return {
        "title": page_snapshots[0].title,
        "description": page_snapshots[0].description,
        "headings": _aggregate_text_lists(
            [snapshot.headings for snapshot in page_snapshots], 240, 2
        ),
        "paragraphs": _aggregate_text_lists(
            [snapshot.paragraphs for snapshot in page_snapshots], 240, 30
        ),
        "links": [
            {"href": link.href, "text": link.text}
            for link in _aggregate_links([snapshot.links for snapshot in page_snapshots], 240)
        ],
        "images": [
            {"src": image.src, "alt": image.alt}
            for image in _aggregate_images([snapshot.images for snapshot in page_snapshots], 240)
        ],
        "tables": [
            {"caption": table.caption, "rows": table.rows}
            for table in _aggregate_tables([snapshot.tables for snapshot in page_snapshots], 8)
        ],
        "meta": [
            {"key": item.key, "value": item.value}
            for item in _aggregate_meta([snapshot.meta for snapshot in page_snapshots])
        ],
        "analysis": {
            "schemaTypes": schema_types,
            "counts": counts,
        },
    }


def _aggregate_text_lists(
    groups: list[list[str]],
    limit: int,
    min_length: int,
) -> list[str]:
    seen: set[str] = set()
    results: list[str] = []

    for group in groups:
        for item in group:
            text = _clean_text(item)
            if len(text) < min_length or text in seen:
                continue
            seen.add(text)
            results.append(text)
            if len(results) >= limit:
                return results

    return results


def _aggregate_images(groups: list[list[ScrapedImage]], limit: int) -> list[ScrapedImage]:
    seen: set[tuple[str, str]] = set()
    results: list[ScrapedImage] = []

    for group in groups:
        for item in group:
            key = (item.src, item.alt)
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
            if len(results) >= limit:
                return results

    return results


def _aggregate_links(groups: list[list[ScrapedLink]], limit: int) -> list[ScrapedLink]:
    seen: set[tuple[str, str]] = set()
    results: list[ScrapedLink] = []

    for group in groups:
        for item in group:
            key = (item.href, item.text)
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
            if len(results) >= limit:
                return results

    return results


def _aggregate_tables(groups: list[list[ScrapedTable]], limit: int) -> list[ScrapedTable]:
    results: list[ScrapedTable] = []
    seen: set[tuple[str | None, tuple[tuple[str, ...], ...]]] = set()

    for group in groups:
        for item in group:
            key = (item.caption, tuple(tuple(row) for row in item.rows))
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
            if len(results) >= limit:
                return results

    return results


def _aggregate_meta(groups: list[list[ScrapedMeta]]) -> list[ScrapedMeta]:
    seen: set[tuple[str, str]] = set()
    results: list[ScrapedMeta] = []

    for group in groups:
        for item in group:
            key = (item.key, item.value)
            if key in seen:
                continue
            seen.add(key)
            results.append(item)
            if len(results) >= 80:
                return results

    return results


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
        href = _normalize_url(_clean_text(item.get("href", "")))
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


def _normalize_url(value: str) -> str:
    return urldefrag(_clean_text(value, 400)).url


def _clean_text(value: Any, max_length: int = 400) -> str:
    text = " ".join(str(value or "").split())
    if not text:
        return ""

    return text[:max_length]

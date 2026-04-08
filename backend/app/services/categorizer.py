from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from math import exp
import re
from typing import Any

from backend.app.schemas.scrape import (
    ClassificationAlternative,
    ClassificationReport,
    ScrapedImage,
    ScrapedLink,
    ScrapedMeta,
    ScrapedTable,
)

TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#.\-/]*")
WHITESPACE_RE = re.compile(r"\s+")


@dataclass(frozen=True)
class CategoryDefinition:
    key: str
    label: str
    url_patterns: tuple[str, ...]
    schema_types: tuple[str, ...]
    strong_phrases: dict[str, float]
    keyword_weights: dict[str, float]


@dataclass
class ClassificationFeatures:
    url_text: str
    text_blob: str
    meta_blob: str
    tokens: Counter[str]
    schema_types: set[str]
    heading_count: int
    paragraph_count: int
    image_count: int
    link_count: int
    table_count: int
    article_count: int
    code_block_count: int
    nav_link_count: int
    video_embed_count: int
    form_count: int
    time_count: int
    price_mention_count: int
    has_apply_link: bool


@dataclass
class CategoryScore:
    definition: CategoryDefinition
    heuristic_score: float
    semantic_score: float
    reasons: list[tuple[float, str]]

    @property
    def combined_score(self) -> float:
        return round((self.heuristic_score * 0.6) + (self.semantic_score * 0.4), 4)


CATEGORY_DEFINITIONS = (
    CategoryDefinition(
        key="ecommerce",
        label="E-commerce",
        url_patterns=("shop", "store", "product", "products", "cart", "checkout", "catalog", "buy"),
        schema_types=("product", "offer", "aggregateoffer"),
        strong_phrases={
            "add to cart": 3.2,
            "buy now": 2.8,
            "out of stock": 2.0,
            "customer reviews": 1.8,
            "free shipping": 1.8,
            "limited offer": 1.6,
        },
        keyword_weights={
            "product": 1.4,
            "price": 1.2,
            "sale": 1.0,
            "discount": 1.0,
            "delivery": 0.9,
            "shipping": 0.9,
            "checkout": 1.4,
            "wishlist": 1.1,
            "brand": 0.7,
        },
    ),
    CategoryDefinition(
        key="blog",
        label="Blog",
        url_patterns=("blog", "blogs", "post", "posts", "article", "story"),
        schema_types=("blogposting", "article"),
        strong_phrases={
            "read more": 1.8,
            "written by": 2.0,
            "share this post": 1.8,
            "leave a comment": 1.8,
        },
        keyword_weights={
            "author": 1.0,
            "blog": 1.2,
            "post": 1.0,
            "tags": 0.8,
            "category": 0.7,
            "opinion": 0.8,
            "newsletter": 0.7,
        },
    ),
    CategoryDefinition(
        key="news",
        label="News",
        url_patterns=("news", "latest", "breaking", "world", "politics", "business"),
        schema_types=("newsarticle", "reportage"),
        strong_phrases={
            "breaking news": 3.0,
            "live updates": 2.6,
            "reported by": 2.2,
            "latest news": 2.2,
        },
        keyword_weights={
            "news": 1.4,
            "report": 1.0,
            "reported": 1.0,
            "editor": 0.8,
            "exclusive": 0.8,
            "update": 0.8,
            "today": 0.6,
        },
    ),
    CategoryDefinition(
        key="video_platform",
        label="Video platform",
        url_patterns=("watch", "video", "videos", "playlist", "channel", "stream", "shorts"),
        schema_types=("videoobject", "mediaobject"),
        strong_phrases={
            "watch now": 2.4,
            "live stream": 2.2,
            "watch later": 2.0,
            "subscribe to channel": 2.4,
        },
        keyword_weights={
            "video": 1.4,
            "channel": 1.1,
            "playlist": 1.1,
            "stream": 1.0,
            "episode": 0.9,
            "trailer": 0.9,
            "views": 0.9,
            "subscribers": 1.0,
        },
    ),
    CategoryDefinition(
        key="job_portal",
        label="Job portal",
        url_patterns=("job", "jobs", "career", "careers", "vacancy", "vacancies", "hiring", "apply"),
        schema_types=("jobposting",),
        strong_phrases={
            "apply now": 3.0,
            "job description": 2.6,
            "years of experience": 2.4,
            "full time": 1.6,
            "part time": 1.6,
        },
        keyword_weights={
            "salary": 1.2,
            "location": 0.8,
            "resume": 1.2,
            "recruiter": 1.0,
            "responsibilities": 1.0,
            "qualifications": 1.0,
            "company": 0.8,
            "remote": 0.9,
        },
    ),
    CategoryDefinition(
        key="academic_assignment",
        label="Academic or assignment portal",
        url_patterns=("course", "courses", "assignment", "assignments", "lesson", "lessons", "problem", "problems", "quiz", "learn"),
        schema_types=("course", "learningresource", "quiz"),
        strong_phrases={
            "learning objectives": 2.4,
            "course syllabus": 2.6,
            "submit assignment": 3.0,
            "practice problem": 2.6,
            "week 1": 1.8,
        },
        keyword_weights={
            "course": 1.3,
            "assignment": 1.3,
            "lesson": 1.1,
            "quiz": 1.2,
            "module": 1.0,
            "lecture": 1.0,
            "students": 0.8,
            "instructor": 0.9,
            "problem": 1.1,
            "tutorial": 0.9,
        },
    ),
    CategoryDefinition(
        key="documentation",
        label="Documentation site",
        url_patterns=("docs", "documentation", "reference", "api", "sdk", "guide", "guides", "manual"),
        schema_types=("techarticle", "apireference"),
        strong_phrases={
            "getting started": 2.4,
            "api reference": 3.0,
            "quickstart": 2.2,
            "request parameters": 2.4,
            "response body": 2.2,
        },
        keyword_weights={
            "docs": 1.2,
            "documentation": 1.2,
            "api": 1.3,
            "endpoint": 1.1,
            "request": 0.9,
            "response": 0.9,
            "install": 0.9,
            "configuration": 0.8,
            "example": 0.7,
            "code": 0.7,
            "sdk": 1.0,
            "cli": 0.9,
        },
    ),
    CategoryDefinition(
        key="social_platform",
        label="Social platform",
        url_patterns=("feed", "profile", "profiles", "post", "posts", "status", "community", "forum", "forums", "messages"),
        schema_types=("profilepage", "socialmediapost", "discussionforumpost"),
        strong_phrases={
            "sign in to continue": 2.2,
            "follow this creator": 2.4,
            "join the community": 2.2,
            "share your thoughts": 2.0,
        },
        keyword_weights={
            "profile": 1.1,
            "post": 1.0,
            "community": 1.0,
            "feed": 1.0,
            "timeline": 1.0,
            "likes": 0.9,
            "comments": 0.9,
            "followers": 1.1,
            "following": 1.1,
            "reply": 0.8,
        },
    ),
)


def classify_scrape(
    *,
    url: str,
    final_url: str,
    title: str,
    description: str,
    headings: list[str],
    paragraphs: list[str],
    images: list[ScrapedImage],
    links: list[ScrapedLink],
    tables: list[ScrapedTable],
    meta: list[ScrapedMeta],
    raw_result: dict[str, Any],
) -> ClassificationReport:
    features = _build_features(
        url=url,
        final_url=final_url,
        title=title,
        description=description,
        headings=headings,
        paragraphs=paragraphs,
        images=images,
        links=links,
        tables=tables,
        meta=meta,
        raw_result=raw_result,
    )
    scores = [_score_category(definition, features) for definition in CATEGORY_DEFINITIONS]
    scores.sort(key=lambda item: item.combined_score, reverse=True)

    if not scores:
        return _general_report([])

    top_score = scores[0]
    probabilities = _score_probabilities(scores)

    if top_score.combined_score < 2.15:
        return _general_report(scores, probabilities)

    second_combined = scores[1].combined_score if len(scores) > 1 else 0.0
    margin = max(0.0, top_score.combined_score - second_combined)
    base_confidence = max(probabilities.get(top_score.definition.key, 0.0), 0.48)
    confidence = round(min(0.98, base_confidence + min(margin / 10, 0.18)), 2)

    return ClassificationReport(
        key=top_score.definition.key,
        label=top_score.definition.label,
        confidence=confidence,
        heuristic_score=round(top_score.heuristic_score, 2),
        semantic_score=round(top_score.semantic_score, 2),
        rationale=_top_reasons(top_score.reasons),
        alternatives=_build_alternatives(
            scores=scores,
            probabilities=probabilities,
            exclude_key=top_score.definition.key,
        ),
    )


def _general_report(
    scores: list[CategoryScore],
    probabilities: dict[str, float] | None = None,
) -> ClassificationReport:
    return ClassificationReport(
        key="general",
        label="General website",
        confidence=0.52,
        heuristic_score=0,
        semantic_score=0,
        rationale=[
            "No dominant structural or semantic signals matched a specialized website category."
        ],
        alternatives=_build_alternatives(
            scores=scores,
            probabilities=probabilities or _score_probabilities(scores),
            exclude_key="general",
        ),
    )


def _build_features(
    *,
    url: str,
    final_url: str,
    title: str,
    description: str,
    headings: list[str],
    paragraphs: list[str],
    images: list[ScrapedImage],
    links: list[ScrapedLink],
    tables: list[ScrapedTable],
    meta: list[ScrapedMeta],
    raw_result: dict[str, Any],
) -> ClassificationFeatures:
    analysis = raw_result.get("analysis", {}) if isinstance(raw_result, dict) else {}
    counts = analysis.get("counts", {}) if isinstance(analysis, dict) else {}
    schema_types = analysis.get("schemaTypes", []) if isinstance(analysis, dict) else []

    meta_blob = _normalize_text(" ".join(f"{item.key} {item.value}" for item in meta))
    text_sections = [
        url,
        final_url,
        title,
        description,
        meta_blob,
        " ".join(headings[:20]),
        " ".join(paragraphs[:18]),
        " ".join(link.text for link in links[:30]),
    ]
    text_blob = _normalize_text(" ".join(section for section in text_sections if section))
    tokens = Counter(TOKEN_RE.findall(text_blob))

    return ClassificationFeatures(
        url_text=_normalize_text(f"{url} {final_url}"),
        text_blob=text_blob,
        meta_blob=meta_blob,
        tokens=tokens,
        schema_types={
            _normalize_text(str(value)).replace("schema.org/", "")
            for value in schema_types
            if _normalize_text(str(value))
        },
        heading_count=len(headings),
        paragraph_count=len(paragraphs),
        image_count=len(images),
        link_count=len(links),
        table_count=len(tables),
        article_count=_safe_int(counts.get("articleCount")),
        code_block_count=_safe_int(counts.get("codeBlockCount")),
        nav_link_count=_safe_int(counts.get("navLinkCount")),
        video_embed_count=_safe_int(counts.get("videoEmbedCount")),
        form_count=_safe_int(counts.get("formCount")),
        time_count=_safe_int(counts.get("timeCount")),
        price_mention_count=_safe_int(counts.get("priceMentionCount")),
        has_apply_link=any(
            "apply" in _normalize_text(link.text) or "apply" in _normalize_text(link.href)
            for link in links
        ),
    )


def _score_category(
    definition: CategoryDefinition,
    features: ClassificationFeatures,
) -> CategoryScore:
    reasons: list[tuple[float, str]] = []
    heuristic_score = 0.0
    semantic_score = 0.0

    matched_url_patterns = [
        pattern for pattern in definition.url_patterns if pattern in features.url_text
    ]
    if matched_url_patterns:
        contribution = min(2.8, 1.2 + (len(matched_url_patterns) - 1) * 0.45)
        heuristic_score += contribution
        reasons.append(
            (
                contribution,
                f"URL structure matched {definition.label.lower()} paths such as {matched_url_patterns[0]}.",
            )
        )

    matched_schema_types = sorted(
        schema_type
        for schema_type in features.schema_types
        if schema_type in definition.schema_types
    )
    if matched_schema_types:
        contribution = min(3.3, 2.4 + (len(matched_schema_types) - 1) * 0.35)
        heuristic_score += contribution
        reasons.append(
            (
                contribution,
                f"Structured data included {', '.join(matched_schema_types[:2])}.",
            )
        )

    for contribution, reason in _structural_reasons(definition.key, features):
        heuristic_score += contribution
        reasons.append((contribution, reason))

    phrase_matches = [
        (phrase, weight)
        for phrase, weight in definition.strong_phrases.items()
        if phrase in features.text_blob or phrase in features.meta_blob
    ]
    if phrase_matches:
        contribution = sum(weight for _, weight in phrase_matches[:3])
        semantic_score += contribution
        sample_phrases = ", ".join(f"'{phrase}'" for phrase, _ in phrase_matches[:2])
        reasons.append(
            (
                contribution,
                f"Content language referenced {sample_phrases}.",
            )
        )

    keyword_matches: list[tuple[str, float]] = []
    for keyword, weight in definition.keyword_weights.items():
        hits = min(features.tokens.get(keyword, 0), 3)
        if hits <= 0:
            continue

        keyword_matches.append((keyword, weight * hits * 0.45))

    if keyword_matches:
        keyword_matches.sort(key=lambda item: item[1], reverse=True)
        contribution = sum(weight for _, weight in keyword_matches[:4])
        semantic_score += contribution
        sample_keywords = ", ".join(keyword for keyword, _ in keyword_matches[:4])
        reasons.append(
            (
                contribution,
                f"Semantic cues included {sample_keywords}.",
            )
        )

    return CategoryScore(
        definition=definition,
        heuristic_score=heuristic_score,
        semantic_score=semantic_score,
        reasons=reasons,
    )


def _structural_reasons(
    category_key: str,
    features: ClassificationFeatures,
) -> list[tuple[float, str]]:
    reasons: list[tuple[float, str]] = []

    if category_key == "ecommerce":
        if features.price_mention_count >= 2:
            reasons.append(
                (
                    min(2.7, 1.4 + features.price_mention_count * 0.22),
                    f"Detected {features.price_mention_count} price mentions typical of product pages.",
                )
            )
        if features.image_count >= 8:
            reasons.append(
                (
                    min(1.2, 0.5 + features.image_count * 0.04),
                    f"Detected a media-heavy layout with {features.image_count} images.",
                )
            )

    if category_key == "blog":
        if features.article_count >= 1 and features.paragraph_count >= 6:
            reasons.append(
                (
                    1.9,
                    "Detected article-style structure with long-form paragraph content.",
                )
            )
        if features.time_count >= 1:
            reasons.append((0.8, "Found publication timestamps that are common on blogs."))

    if category_key == "news":
        if features.article_count >= 1 and features.time_count >= 1:
            reasons.append(
                (
                    2.0,
                    "Detected article layout with publication timing signals common on news pages.",
                )
            )
        if features.link_count >= 25:
            reasons.append(
                (
                    0.8,
                    f"Detected a dense outgoing-link layout with {features.link_count} links.",
                )
            )

    if category_key == "video_platform":
        if features.video_embed_count >= 1:
            reasons.append(
                (
                    min(3.2, 2.5 + features.video_embed_count * 0.2),
                    f"Detected {features.video_embed_count} embedded video surfaces.",
                )
            )

    if category_key == "job_portal":
        if features.has_apply_link:
            reasons.append((1.8, "Detected application-oriented links on the page."))
        if features.form_count >= 1:
            reasons.append((0.7, "Detected form elements common in job application flows."))

    if category_key == "academic_assignment":
        if features.paragraph_count >= 4 and features.heading_count >= 3:
            reasons.append(
                (
                    0.9,
                    "Detected lesson-style structure with multiple headings and explanatory sections.",
                )
            )
        if features.form_count >= 1:
            reasons.append((0.5, "Detected interactive course or submission inputs."))

    if category_key == "documentation":
        if features.code_block_count >= 3:
            reasons.append(
                (
                    min(3.0, 1.3 + features.code_block_count * 0.18),
                    f"Detected {features.code_block_count} code blocks typical of documentation.",
                )
            )
        if features.nav_link_count >= 8:
            reasons.append(
                (
                    min(1.8, 0.7 + features.nav_link_count * 0.05),
                    f"Detected doc-style navigation density with {features.nav_link_count} nav links.",
                )
            )
        if features.table_count >= 1:
            reasons.append((0.4, "Detected reference-style tabular content."))

    if category_key == "social_platform":
        if features.link_count >= 20 and features.form_count >= 1:
            reasons.append(
                (
                    1.2,
                    "Detected interactive feed-style structure with many links and input surfaces.",
                )
            )

    return reasons


def _score_probabilities(scores: list[CategoryScore]) -> dict[str, float]:
    if not scores:
        return {}

    max_score = max(score.combined_score for score in scores)
    scaled = {
        score.definition.key: exp((score.combined_score - max_score) / 1.9)
        for score in scores
    }
    total = sum(scaled.values()) or 1.0
    return {key: round(value / total, 4) for key, value in scaled.items()}


def _build_alternatives(
    *,
    scores: list[CategoryScore],
    probabilities: dict[str, float],
    exclude_key: str,
) -> list[ClassificationAlternative]:
    alternatives: list[ClassificationAlternative] = []

    for score in scores:
        if score.definition.key == exclude_key:
            continue

        confidence = probabilities.get(score.definition.key, 0.0)
        if confidence < 0.12:
            continue

        alternatives.append(
            ClassificationAlternative(
                key=score.definition.key,
                label=score.definition.label,
                confidence=round(min(0.95, confidence), 2),
            )
        )
        if len(alternatives) >= 3:
            break

    return alternatives


def _top_reasons(reasons: list[tuple[float, str]]) -> list[str]:
    unique: list[str] = []
    for _, reason in sorted(reasons, key=lambda item: item[0], reverse=True):
        if reason in unique:
            continue
        unique.append(reason)
        if len(unique) >= 4:
            break
    return unique


def _normalize_text(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value.strip().lower())


def _safe_int(value: Any) -> int:
    try:
        return max(int(value), 0)
    except (TypeError, ValueError):
        return 0

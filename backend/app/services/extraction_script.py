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

  const escapeCss = (value) => {
    try {
      return CSS.escape(value);
    } catch {
      return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\\\$&");
    }
  };

  const selectorFromElement = (element) => {
    if (!element || !(element instanceof Element)) return "";
    if (element.id) return `#${escapeCss(element.id)}`;

    const parts = [];
    let current = element;

    while (current && current.nodeType === 1 && current !== document.body) {
      let part = current.tagName.toLowerCase();
      const usefulClass = Array.from(current.classList || []).find((name) =>
        /(pagination|pager|page|next|load|more|nav)/i.test(name)
      );

      if (usefulClass) {
        part += `.${escapeCss(usefulClass)}`;
        parts.unshift(part);
        break;
      }

      if (current.parentElement) {
        const siblings = Array.from(current.parentElement.children).filter(
          (child) => child.tagName === current.tagName
        );
        if (siblings.length > 1) {
          part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
      }

      parts.unshift(part);
      current = current.parentElement;
    }

    return parts.join(" > ");
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
      text: clean(
        element.textContent ||
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          ""
      ),
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

  const bodyText = clean(document.body?.innerText || "");
  const schemaTypes = (() => {
    const values = new Set();
    const registerType = (value) => {
      if (!value) return;
      if (Array.isArray(value)) {
        value.forEach(registerType);
        return;
      }

      if (typeof value === "string") {
        const normalized = clean(value).replace(/^https?:\\/\\/schema.org\\//i, "");
        if (normalized) values.add(normalized.toLowerCase());
      }
    };

    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }

      registerType(value["@type"]);
      Object.values(value).forEach(visit);
    };

    Array.from(document.querySelectorAll('script[type="application/ld+json"]')).forEach((script) => {
      try {
        visit(JSON.parse(script.textContent || "null"));
      } catch {
        // Ignore malformed schema blobs.
      }
    });

    return Array.from(values);
  })();

  const paginationCandidates = [];
  const seenCandidates = new Set();

  const addPaginationCandidate = (element, kind) => {
    if (!element) return;

    const label = clean(
      element.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        ""
    );
    const href = toAbsolute(element.getAttribute("href") || "");
    const selector = selectorFromElement(element);
    const disabled =
      element.matches(":disabled") ||
      element.getAttribute("aria-disabled") === "true" ||
      /disabled/i.test(element.className || "");
    const current =
      element.getAttribute("aria-current") === "page" ||
      /(^|\\s)(active|current|selected)(\\s|$)/i.test(element.className || "");
    const pageNumber = /^\\d+$/.test(label) ? Number.parseInt(label, 10) : null;
    const normalizedLabel =
      label || (kind === "next" ? "Next" : kind === "load_more" ? "Load more" : "Page");
    const key = [kind, href, selector, normalizedLabel].join("|");

    if ((!href && !selector) || seenCandidates.has(key)) return;

    seenCandidates.add(key);
    paginationCandidates.push({
      kind,
      label: normalizedLabel,
      href: href || null,
      selector: selector || null,
      pageNumber,
      current,
      disabled,
    });
  };

  const paginationScopes = new Set([
    ...document.querySelectorAll(
      "nav, [role='navigation'], [class*='pagination'], [class*='pager'], [aria-label*='pagination' i]"
    ),
  ]);

  paginationScopes.forEach((scope) => {
    Array.from(scope.querySelectorAll("a[href], button")).forEach((element) => {
      const text = clean(
        element.textContent ||
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          ""
      ).toLowerCase();

      if (!text) return;

      if (/^(next|next page|older|older posts|>|>>|›|»)$/i.test(text) || /\\bnext\\b/i.test(text)) {
        addPaginationCandidate(element, "next");
        return;
      }

      if (/^(load more|show more|see more|view more|more results)$/i.test(text)) {
        addPaginationCandidate(element, "load_more");
        return;
      }

      if (/^\\d+$/.test(text)) {
        addPaginationCandidate(element, "numbered");
      }
    });
  });

  Array.from(document.querySelectorAll("a[rel='next'], link[rel='next']")).forEach((element) =>
    addPaginationCandidate(element, "next")
  );

  Array.from(document.querySelectorAll("button, a[href]")).forEach((element) => {
    const text = clean(
      element.textContent ||
        element.getAttribute("aria-label") ||
        element.getAttribute("title") ||
        ""
    ).toLowerCase();

    if (/^(load more|show more|see more|view more|more results)$/i.test(text)) {
      addPaginationCandidate(element, "load_more");
    }
  });

  const nextCandidate = paginationCandidates.find(
    (candidate) => candidate.kind === "next" && !candidate.disabled && candidate.href
  );

  const feedIndicators = document.querySelectorAll(
    "[data-infinite-scroll], [class*='infinite'], [id*='infinite'], [data-testid*='infinite']"
  ).length;
  const scrollHeight = Math.max(
    document.body?.scrollHeight || 0,
    document.documentElement?.scrollHeight || 0
  );
  const viewportHeight = Math.max(window.innerHeight || 0, 1);
  const supportsInfiniteScroll =
    paginationCandidates.some((candidate) => candidate.kind === "load_more") ||
    feedIndicators > 0 ||
    (scrollHeight > viewportHeight * 3 &&
      document.querySelectorAll("article, [role='article'], li, .card, .result").length >= 18);

  const priceMentionCount = (
    bodyText.match(/(?:\\u20b9|\\$|\\u20ac|\\u00a3|rs\\.?|usd|eur|gbp|inr)\\s?\\d[\\d,]*(?:\\.\\d{1,2})?/gi) || []
  ).length;

  return {
    title: clean(document.title),
    description: findMeta("description", "og:description", "twitter:description"),
    headings,
    paragraphs,
    links,
    images,
    tables,
    meta,
    pagination: {
      hasPagination: paginationCandidates.length > 0,
      supportsInfiniteScroll,
      nextUrl: nextCandidate?.href || "",
      candidates: paginationCandidates.slice(0, 12),
    },
    analysis: {
      schemaTypes,
      counts: {
        articleCount: document.querySelectorAll("article").length,
        codeBlockCount: document.querySelectorAll("pre, code").length,
        formCount: document.querySelectorAll("form").length,
        navLinkCount: document.querySelectorAll("nav a, aside a").length,
        timeCount: document.querySelectorAll("time").length,
        videoEmbedCount: document.querySelectorAll("video, iframe[src*='youtube'], iframe[src*='vimeo'], iframe[src*='dailymotion']").length,
        priceMentionCount,
      },
    },
  };
}
"""

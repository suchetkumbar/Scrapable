import { apiRequest } from "@/lib/api/client";

export type PaginationMode = "current" | "next" | "all";

export interface ScrapedImage {
  src: string;
  alt: string;
}

export interface ScrapedLink {
  href: string;
  text: string;
}

export interface ScrapedMeta {
  key: string;
  value: string;
}

export interface ScrapedTable {
  caption?: string | null;
  rows: string[][];
}

export interface RobotsStatus {
  url: string;
  allowed: boolean;
  status: string;
}

export interface ClassificationAlternative {
  key: string;
  label: string;
  confidence: number;
}

export interface ClassificationResult {
  key: string;
  label: string;
  confidence: number;
  heuristicScore: number;
  semanticScore: number;
  rationale: string[];
  alternatives: ClassificationAlternative[];
}

export interface PaginationCandidate {
  kind: "next" | "numbered" | "load_more";
  label: string;
  href?: string | null;
  selector?: string | null;
  pageNumber?: number | null;
  current: boolean;
  disabled: boolean;
}

export interface PaginationPageSummary {
  pageNumber: number;
  url: string;
  finalUrl: string;
  title: string;
  statusCode: number | null;
  headings: number;
  paragraphs: number;
  images: number;
  links: number;
  tables: number;
}

export interface PaginationReport {
  mode: PaginationMode;
  strategy: string;
  pageLimit: number;
  pagesRequested: number;
  pagesScraped: number;
  hasPagination: boolean;
  supportsInfiniteScroll: boolean;
  nextUrl?: string | null;
  stoppedReason?: string | null;
  visitedUrls: string[];
  candidates: PaginationCandidate[];
  pageSummaries: PaginationPageSummary[];
}

export interface ScrapeResult {
  url: string;
  finalUrl: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  images: ScrapedImage[];
  links: ScrapedLink[];
  tables: ScrapedTable[];
  meta: ScrapedMeta[];
  statusCode: number | null;
  robots: RobotsStatus;
  classification: ClassificationResult;
  pagination: PaginationReport;
  scrapedAt: string;
}

export interface StartScrapeJobInput {
  url: string;
  paginationMode: PaginationMode;
  pageLimit: number;
  enableInfiniteScroll: boolean;
}

export interface ScrapeJobStatus {
  jobId: string;
  state: "queued" | "running" | "completed" | "failed";
  progress: number;
  stage: string;
  mode: PaginationMode;
  pagesCompleted: number;
  pagesTarget: number;
  error?: string | null;
  result?: ScrapeResult | null;
  createdAt: string;
  updatedAt: string;
}

interface ScrapeApiResponse {
  url: string;
  final_url: string;
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  images: ScrapedImage[];
  links: ScrapedLink[];
  tables: ScrapedTable[];
  meta: ScrapedMeta[];
  status_code: number | null;
  robots: RobotsStatus;
  classification: {
    key: string;
    label: string;
    confidence: number;
    heuristic_score: number;
    semantic_score: number;
    rationale: string[];
    alternatives: ClassificationAlternative[];
  };
  pagination: {
    mode: PaginationMode;
    strategy: string;
    page_limit: number;
    pages_requested: number;
    pages_scraped: number;
    has_pagination: boolean;
    supports_infinite_scroll: boolean;
    next_url?: string | null;
    stopped_reason?: string | null;
    visited_urls: string[];
    candidates: Array<{
      kind: "next" | "numbered" | "load_more";
      label: string;
      href?: string | null;
      selector?: string | null;
      page_number?: number | null;
      current: boolean;
      disabled: boolean;
    }>;
    page_summaries: Array<{
      page_number: number;
      url: string;
      final_url: string;
      title: string;
      status_code: number | null;
      headings: number;
      paragraphs: number;
      images: number;
      links: number;
      tables: number;
    }>;
  };
  scraped_at: string;
}

interface ScrapeJobApiResponse {
  job_id: string;
  state: "queued" | "running" | "completed" | "failed";
  progress: number;
  stage: string;
  mode: PaginationMode;
  pages_completed: number;
  pages_target: number;
  error?: string | null;
  result?: ScrapeApiResponse | null;
  created_at: string;
  updated_at: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const response = await apiRequest<ScrapeApiResponse>("/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  return mapScrapeResponse(response);
}

export async function startScrapeJob(
  payload: StartScrapeJobInput
): Promise<ScrapeJobStatus> {
  const response = await apiRequest<ScrapeJobApiResponse>("/scrape/jobs", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: payload.url,
      pagination_mode: payload.paginationMode,
      page_limit: payload.pageLimit,
      enable_infinite_scroll: payload.enableInfiniteScroll,
    }),
  });

  return mapScrapeJobResponse(response);
}

export async function getScrapeJob(jobId: string): Promise<ScrapeJobStatus> {
  const response = await apiRequest<ScrapeJobApiResponse>(`/scrape/jobs/${jobId}`);
  return mapScrapeJobResponse(response);
}

function mapScrapeJobResponse(response: ScrapeJobApiResponse): ScrapeJobStatus {
  return {
    jobId: response.job_id,
    state: response.state,
    progress: response.progress,
    stage: response.stage,
    mode: response.mode,
    pagesCompleted: response.pages_completed,
    pagesTarget: response.pages_target,
    error: response.error,
    result: response.result ? mapScrapeResponse(response.result) : null,
    createdAt: response.created_at,
    updatedAt: response.updated_at,
  };
}

function mapScrapeResponse(response: ScrapeApiResponse): ScrapeResult {
  return {
    url: response.url,
    finalUrl: response.final_url,
    title: response.title,
    description: response.description,
    headings: response.headings,
    paragraphs: response.paragraphs,
    images: response.images,
    links: response.links,
    tables: response.tables,
    meta: response.meta,
    statusCode: response.status_code,
    robots: response.robots,
    classification: {
      key: response.classification.key,
      label: response.classification.label,
      confidence: response.classification.confidence,
      heuristicScore: response.classification.heuristic_score,
      semanticScore: response.classification.semantic_score,
      rationale: response.classification.rationale,
      alternatives: response.classification.alternatives,
    },
    pagination: {
      mode: response.pagination.mode,
      strategy: response.pagination.strategy,
      pageLimit: response.pagination.page_limit,
      pagesRequested: response.pagination.pages_requested,
      pagesScraped: response.pagination.pages_scraped,
      hasPagination: response.pagination.has_pagination,
      supportsInfiniteScroll: response.pagination.supports_infinite_scroll,
      nextUrl: response.pagination.next_url,
      stoppedReason: response.pagination.stopped_reason,
      visitedUrls: response.pagination.visited_urls,
      candidates: response.pagination.candidates.map((candidate) => ({
        kind: candidate.kind,
        label: candidate.label,
        href: candidate.href,
        selector: candidate.selector,
        pageNumber: candidate.page_number,
        current: candidate.current,
        disabled: candidate.disabled,
      })),
      pageSummaries: response.pagination.page_summaries.map((summary) => ({
        pageNumber: summary.page_number,
        url: summary.url,
        finalUrl: summary.final_url,
        title: summary.title,
        statusCode: summary.status_code,
        headings: summary.headings,
        paragraphs: summary.paragraphs,
        images: summary.images,
        links: summary.links,
        tables: summary.tables,
      })),
    },
    scrapedAt: response.scraped_at,
  };
}

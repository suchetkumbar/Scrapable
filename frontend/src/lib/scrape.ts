import { apiRequest } from "@/lib/api/client";

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
  scrapedAt: string;
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
  scraped_at: string;
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const response = await apiRequest<ScrapeApiResponse>("/scrape", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

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
    scrapedAt: response.scraped_at,
  };
}

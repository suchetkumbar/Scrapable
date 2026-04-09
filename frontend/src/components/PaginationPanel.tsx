import { motion } from "framer-motion";
import type { FC } from "react";
import { ArrowRight, CopyPlus, MousePointerClick } from "lucide-react";

import type { PaginationReport } from "@/lib/scrape";

interface Props {
  pagination: PaginationReport;
}

const PaginationPanel: FC<Props> = ({ pagination }) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-2xl p-5 space-y-5"
  >
    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Phase 4 pagination
        </p>
        <h3 className="text-2xl font-semibold text-foreground">
          {pagination.pagesScraped} of {pagination.pagesRequested} page targets scraped
        </h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Strategy: <span className="text-foreground">{formatStrategy(pagination.strategy)}</span>
          {" "}with {pagination.supportsInfiniteScroll ? "infinite-scroll support" : "link-based pagination only"}.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Metric label="Mode" value={formatMode(pagination.mode)} />
        <Metric label="Limit" value={String(pagination.pageLimit)} />
        <Metric label="Detected" value={pagination.hasPagination ? "Yes" : "No"} />
        <Metric label="Visited" value={String(pagination.visitedUrls.length)} />
      </div>
    </div>

    {pagination.stoppedReason && (
      <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          Stop reason
        </p>
        <p className="text-sm text-foreground mt-2">{pagination.stoppedReason}</p>
      </div>
    )}

    <div className="grid gap-5 xl:grid-cols-[1fr,1fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Page summaries
        </p>
        <div className="space-y-2">
          {pagination.pageSummaries.map((page) => (
            <div
              key={`${page.pageNumber}-${page.finalUrl}`}
              className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground truncate">
                  Page {page.pageNumber}: {page.title}
                </p>
                <span className="text-xs text-muted-foreground">
                  HTTP {page.statusCode ?? "?"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">{page.finalUrl}</p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted-foreground">
                <span>{page.headings} headings</span>
                <span>{page.paragraphs} paragraphs</span>
                <span>{page.links} links</span>
                <span>{page.images} images</span>
                <span>{page.tables} tables</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Detected controls
          </p>
          <div className="flex flex-wrap gap-2">
            {pagination.candidates.length > 0 ? (
              pagination.candidates.map((candidate) => (
                <span
                  key={`${candidate.kind}-${candidate.href ?? candidate.label}`}
                  className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-foreground"
                >
                  {iconForCandidate(candidate.kind)}
                  <span className="ml-1">{candidate.label}</span>
                </span>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No explicit pagination controls were detected.
              </span>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Visited URLs
          </p>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {pagination.visitedUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">Step {index + 1}</p>
                <p className="text-sm text-foreground break-all mt-1">{url}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </motion.section>
);

interface MetricProps {
  label: string;
  value: string;
}

const Metric: FC<MetricProps> = ({ label, value }) => (
  <div className="rounded-xl border border-border/60 bg-secondary/25 px-4 py-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
  </div>
);

function formatMode(mode: PaginationReport["mode"]) {
  if (mode === "current") return "Current";
  if (mode === "next") return "Current + next";
  return "All pages";
}

function formatStrategy(strategy: string) {
  return strategy.replace(/_/g, " ");
}

function iconForCandidate(kind: PaginationReport["candidates"][number]["kind"]) {
  if (kind === "next") return <ArrowRight className="inline h-3.5 w-3.5 text-primary" />;
  if (kind === "load_more") {
    return <CopyPlus className="inline h-3.5 w-3.5 text-primary" />;
  }
  return <MousePointerClick className="inline h-3.5 w-3.5 text-primary" />;
}

export default PaginationPanel;

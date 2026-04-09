import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Layers3,
  Link2,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import heroBg from "@/assets/hero-bg.jpg";
import ClassificationPanel from "@/components/ClassificationPanel";
import GlowInput from "@/components/GlowInput";
import JsonViewer from "@/components/JsonViewer";
import PaginationControls from "@/components/PaginationControls";
import PaginationPanel from "@/components/PaginationPanel";
import ResultCards from "@/components/ResultCards";
import ResultTable from "@/components/ResultTable";
import ScrapeProgress from "@/components/ScrapeProgress";
import StatsBar from "@/components/StatsBar";
import ViewToggle, { type View } from "@/components/ViewToggle";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { useScrapeJob } from "@/hooks/use-scrape-job";
import { apiBaseUrl } from "@/lib/config";
import {
  getScrapeJob,
  type PaginationMode,
  type ScrapeJobStatus,
  type ScrapeResult,
} from "@/lib/scrape";

const PHASE_FOUR_STEPS = [
  "Queue job",
  "Check robots",
  "Render page",
  "Paginate",
  "Aggregate",
];

const POLL_INTERVAL_MS = 850;

const getHostname = (value: string) => {
  try {
    return new URL(value).hostname;
  } catch {
    return value;
  }
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const Index = () => {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [view, setView] = useState<View>("cards");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScraping, setIsScraping] = useState(false);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>("current");
  const [pageLimit, setPageLimit] = useState(3);
  const [enableInfiniteScroll, setEnableInfiniteScroll] = useState(true);
  const [jobStatus, setJobStatus] = useState<ScrapeJobStatus | null>(null);

  const activeScrapeRef = useRef(false);
  const activeJobIdRef = useRef<string | null>(null);
  const healthQuery = useBackendHealth();
  const startJobMutation = useScrapeJob();

  const backendLabel = healthQuery.isPending
    ? "Checking"
    : healthQuery.isSuccess
      ? "Connected"
      : "Offline";

  useEffect(() => {
    return () => {
      activeJobIdRef.current = null;
      activeScrapeRef.current = false;
    };
  }, []);

  const syncJobStatus = (status: ScrapeJobStatus) => {
    setJobStatus(status);
    setProgress(status.progress);
    setStage(status.stage);
  };

  const handleInvalidUrl = () => {
    setErrorMessage("Enter a valid absolute URL to begin scraping.");
    toast.error("Invalid URL", {
      description: "Enter a valid absolute URL such as https://example.com.",
    });
  };

  const pollUntilComplete = async (jobId: string): Promise<ScrapeResult> => {
    while (activeJobIdRef.current === jobId) {
      const status = await getScrapeJob(jobId);
      syncJobStatus(status);

      if (status.state === "completed" && status.result) {
        return status.result;
      }

      if (status.state === "completed") {
        throw new Error("Scrape completed without a result payload.");
      }

      if (status.state === "failed") {
        throw new Error(status.error || "Pagination scrape failed unexpectedly.");
      }

      await delay(POLL_INTERVAL_MS);
    }

    throw new Error("Pagination scrape was interrupted before completion.");
  };

  const handleScrape = async (url: string) => {
    if (activeScrapeRef.current) return;

    activeScrapeRef.current = true;
    activeJobIdRef.current = null;
    setIsScraping(true);
    setErrorMessage(null);
    setResult(null);
    setJobStatus(null);
    setView("cards");
    setProgress(2);
    setStage("Submitting pagination scrape job...");

    try {
      const job = await startJobMutation.mutateAsync({
        url,
        paginationMode,
        pageLimit,
        enableInfiniteScroll,
      });
      activeJobIdRef.current = job.jobId;
      syncJobStatus(job);

      const scraped = await pollUntilComplete(job.jobId);
      setResult(scraped);
      toast.success("Scrape complete", {
        description: `Scraped ${scraped.pagination.pagesScraped} page${
          scraped.pagination.pagesScraped === 1 ? "" : "s"
        } from ${getHostname(scraped.finalUrl)}.`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Scraping failed unexpectedly.";
      setErrorMessage(message);
      toast.error("Scrape failed", {
        description: message,
      });
      setProgress(0);
      setStage("");
    } finally {
      activeScrapeRef.current = false;
      activeJobIdRef.current = null;
      setIsScraping(false);
      startJobMutation.reset();
    }
  };

  return (
    <div className="min-h-screen bg-background bg-mesh relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-15"
        />
        <div className="absolute top-20 left-10 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-glow-blue/10 rounded-full blur-3xl" />
      </div>

      <main className="relative z-10 px-6 py-16 md:py-20">
        <section className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Phase 4 pagination control system
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Scrapable</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Render real pages with Playwright, classify website intent, and
              follow next-page, numbered-pagination, and infinite-scroll flows
              with controlled page limits through the backend API.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm"
          >
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Backend</span>
              <span className="text-foreground font-medium">{backendLabel}</span>
            </div>
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">API</span>
              <span className="text-foreground font-mono">{apiBaseUrl}</span>
            </div>
            <div className="glass rounded-full px-4 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">Browser</span>
              <span className="text-foreground font-medium">
                {healthQuery.data?.playwright.installed ? "Ready" : "Check setup"}
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-12"
          >
            <GlowInput
              onSubmit={handleScrape}
              onInvalid={handleInvalidUrl}
              loading={isScraping}
              placeholder="Paste any public URL to scrape live content..."
              buttonLabel="Start Scrape"
              loadingLabel="Scraping..."
            />
            <PaginationControls
              mode={paginationMode}
              pageLimit={pageLimit}
              enableInfiniteScroll={enableInfiniteScroll}
              disabled={isScraping}
              onModeChange={setPaginationMode}
              onPageLimitChange={(value) =>
                setPageLimit(Math.min(10, Math.max(1, Number.isFinite(value) ? value : 1)))
              }
              onInfiniteScrollChange={setEnableInfiniteScroll}
            />
          </motion.div>

          <AnimatePresence>
            {isScraping && (
              <ScrapeProgress
                progress={progress}
                stage={stage}
                steps={PHASE_FOUR_STEPS}
                pagesCompleted={jobStatus?.pagesCompleted ?? 0}
                pagesTarget={jobStatus?.pagesTarget ?? (paginationMode === "current" ? 1 : paginationMode === "next" ? 2 : pageLimit)}
                modeLabel={formatModeLabel(jobStatus?.mode ?? paginationMode)}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errorMessage && !isScraping && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                className="glass rounded-2xl p-5 max-w-3xl mx-auto mt-8 border border-destructive/30"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground">Scrape failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!result && !isScraping && !errorMessage && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10"
              >
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Controlled pagination
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Choose whether to scrape only the current page, the next page,
                    or every detected page up to your limit.
                  </p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Infinite-scroll support
                  </p>
                  <p className="text-sm text-muted-foreground">
                    The scraper expands lazy-loaded content and load-more
                    surfaces before extracting structured data.
                  </p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Multi-page visibility
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Track pages visited, detected pagination controls, and per-page
                    extraction counts in a single result view.
                  </p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && !isScraping && (
              <motion.section
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 space-y-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-3">
                      <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Final URL</span>
                        <span className="text-foreground font-mono">
                          {getHostname(result.finalUrl)}
                        </span>
                      </div>
                      <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                        <Layers3 className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Pages</span>
                        <span className="text-foreground font-medium">
                          {result.pagination.pagesScraped}/{result.pagination.pagesRequested}
                        </span>
                      </div>
                      <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Category</span>
                        <span className="text-foreground font-medium">
                          {result.classification.label}
                        </span>
                      </div>
                      <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">Robots</span>
                        <span className="text-foreground font-medium">
                          {result.robots.allowed ? "Allowed" : "Blocked"}
                        </span>
                      </div>
                      <div className="glass rounded-full px-4 py-2 text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">HTTP</span>
                        <span className="text-foreground font-medium">
                          {result.statusCode ?? "Unknown"}
                        </span>
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-foreground">
                        {result.title}
                      </h2>
                      <p className="text-sm text-muted-foreground font-mono break-all mt-1">
                        {result.finalUrl}
                      </p>
                    </div>
                    <p className="text-muted-foreground max-w-3xl">
                      {result.description}
                    </p>
                  </div>

                  <ViewToggle active={view} onChange={setView} />
                </div>

                <PaginationPanel pagination={result.pagination} />
                <ClassificationPanel classification={result.classification} />
                <StatsBar data={result} />

                {view === "cards" && <ResultCards data={result} />}
                {view === "table" && <ResultTable data={result} />}
                {view === "json" && <JsonViewer data={result} />}

                <div className="grid grid-cols-1 xl:grid-cols-[1.1fr,0.9fr] gap-6">
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Link2 className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Sample Extracted Links
                      </h3>
                    </div>
                    <div className="space-y-2">
                      {result.links.slice(0, 8).map((link) => (
                        <a
                          key={`${link.href}-${link.text}`}
                          href={link.href}
                          target="_blank"
                          rel="noreferrer"
                          className="block bg-secondary/40 rounded-lg px-3 py-2 hover:bg-secondary/60 transition-colors"
                        >
                          <p className="text-sm text-foreground truncate">{link.text}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.href}
                          </p>
                        </a>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <h3 className="text-sm font-semibold text-foreground">
                        Metadata Snapshot
                      </h3>
                    </div>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {result.meta.slice(0, 12).map((item) => (
                        <div
                          key={`${item.key}-${item.value}`}
                          className="bg-secondary/40 rounded-lg px-3 py-2"
                        >
                          <p className="text-xs text-muted-foreground">{item.key}</p>
                          <p className="text-sm text-foreground break-all">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
};

function formatModeLabel(mode: PaginationMode) {
  if (mode === "current") return "Current page";
  if (mode === "next") return "Current + next";
  return "All pages";
}

export default Index;

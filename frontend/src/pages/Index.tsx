import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Link2,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import heroBg from "@/assets/hero-bg.jpg";
import GlowInput from "@/components/GlowInput";
import JsonViewer from "@/components/JsonViewer";
import ResultCards from "@/components/ResultCards";
import ResultTable from "@/components/ResultTable";
import ScrapeProgress from "@/components/ScrapeProgress";
import StatsBar from "@/components/StatsBar";
import ViewToggle, { type View } from "@/components/ViewToggle";
import { useBackendHealth } from "@/hooks/use-backend-health";
import { useScrapeUrl } from "@/hooks/use-scrape-url";
import { apiBaseUrl } from "@/lib/config";
import type { ScrapeResult } from "@/lib/scrape";

const PHASE_ONE_STAGES = [
  "Checking robots.txt...",
  "Launching browser...",
  "Rendering page...",
  "Extracting structured content...",
];

const Index = () => {
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [view, setView] = useState<View>("cards");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const healthQuery = useBackendHealth();
  const scrapeMutation = useScrapeUrl();

  const isLoading = scrapeMutation.isPending;

  const backendLabel = healthQuery.isPending
    ? "Checking"
    : healthQuery.isSuccess
      ? "Connected"
      : "Offline";

  const stopProgress = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const startProgress = () => {
    stopProgress();
    setProgress(8);
    setStage(PHASE_ONE_STAGES[0]);

    let stepIndex = 0;
    progressTimerRef.current = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, PHASE_ONE_STAGES.length - 1);
      setStage(PHASE_ONE_STAGES[stepIndex]);
      setProgress((current) => Math.min(current + 22, 90));
    }, 950);
  };

  useEffect(() => () => stopProgress(), []);

  const handleInvalidUrl = () => {
    setErrorMessage("Enter a valid absolute URL to begin scraping.");
    toast.error("Invalid URL", {
      description: "Enter a valid absolute URL such as https://example.com.",
    });
  };

  const handleScrape = async (url: string) => {
    setErrorMessage(null);
    setResult(null);
    setView("cards");
    startProgress();

    try {
      const scraped = await scrapeMutation.mutateAsync(url);
      stopProgress();
      setProgress(100);
      setStage("Extraction complete.");
      setResult(scraped);

      toast.success("Scrape complete", {
        description: `Extracted content from ${new URL(scraped.finalUrl).hostname}.`,
      });
    } catch (error) {
      stopProgress();
      setProgress(0);
      setStage("");
      const message =
        error instanceof Error ? error.message : "Scraping failed unexpectedly.";
      setErrorMessage(message);
      toast.error("Scrape failed", {
        description: message,
      });
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
              Phase 1 core scraping engine
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">Scrapable</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Render real pages with Playwright, respect robots.txt, and extract
              structured headings, text, images, links, tables, and metadata
              through the backend API.
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
              loading={isLoading}
              placeholder="Paste any public URL to scrape live content..."
              buttonLabel="Start Scrape"
              loadingLabel="Scraping..."
            />
          </motion.div>

          <AnimatePresence>
            {isLoading && (
              <ScrapeProgress
                progress={progress}
                stage={stage}
                steps={PHASE_ONE_STAGES.map((item) => item.replace("...", ""))}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {errorMessage && !isLoading && (
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
            {!result && !isLoading && !errorMessage && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10"
              >
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Dynamic rendering
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Playwright loads JavaScript-heavy pages before extraction so
                    modern frontends are handled in the same pipeline.
                  </p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    robots.txt compliance
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Every scrape checks robots.txt first and blocks extraction
                    when the target explicitly disallows it.
                  </p>
                </div>
                <div className="glass rounded-2xl p-5">
                  <p className="text-sm font-semibold text-foreground mb-2">
                    Structured output
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Results are normalized into headings, paragraphs, links,
                    images, tables, and metadata ready for later phases.
                  </p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {result && !isLoading && (
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
                          {new URL(result.finalUrl).hostname}
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

export default Index;

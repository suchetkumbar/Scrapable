import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import heroBg from "@/assets/hero-bg.jpg";
import { Sparkles, Zap, Globe, Shield, Layers } from "lucide-react";
import GlowInput from "@/components/GlowInput";
import ScrapeProgress from "@/components/ScrapeProgress";
import CategoryBadge from "@/components/CategoryBadge";
import ResultCards from "@/components/ResultCards";
import ResultTable from "@/components/ResultTable";
import JsonViewer from "@/components/JsonViewer";
import ViewToggle, { type View } from "@/components/ViewToggle";
import FeatureSidebar from "@/components/FeatureSidebar";
import AiEnhancement from "@/components/AiEnhancement";
import StatsBar from "@/components/StatsBar";
import { simulateScrape, type ScrapeResult } from "@/lib/mock-data";
import { toast } from "sonner";

const STAGES = [
  "Connecting to server...",
  "Fetching page content...",
  "Parsing DOM structure...",
  "Running AI analysis...",
  "Structuring data...",
];

const Index = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const [view, setView] = useState<View>("cards");
  const [aiQuery, setAiQuery] = useState<string>();
  const [showAi, setShowAi] = useState(false);

  const handleScrape = useCallback(async (url: string) => {
    setLoading(true);
    setProgress(0);
    setResult(null);
    setShowAi(false);
    setAiQuery(undefined);

    for (let i = 0; i < STAGES.length; i++) {
      setStage(STAGES[i]);
      setProgress(Math.min((i + 1) * 20, 95));
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const data = await simulateScrape(url);
    setProgress(100);
    setStage("Complete!");
    setResult(data);
    setLoading(false);

    const history = JSON.parse(localStorage.getItem("scrape_history") || "[]");
    history.unshift({ url, category: data.category.name, time: data.scrapedAt });
    localStorage.setItem("scrape_history", JSON.stringify(history.slice(0, 50)));

    toast.success("Scraping complete!", {
      description: `Classified as ${data.category.name}`,
    });
  }, []);

  const handleExport = useCallback(
    (format: string) => {
      if (!result) return;

      const content =
        format === "JSON"
          ? JSON.stringify(result, null, 2)
          : format === "CSV"
            ? [
                Object.keys(result).join(","),
                Object.values(result)
                  .map((value) =>
                    typeof value === "string" ? value : JSON.stringify(value)
                  )
                  .join(","),
              ].join("\n")
            : JSON.stringify(result);

      const blob = new Blob([content], { type: "text/plain" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `scrape-${Date.now()}.${format.toLowerCase()}`;
      link.click();
      toast.success(`Exported as ${format}`);
    },
    [result]
  );

  const handleAiQuery = useCallback((query: string) => {
    setAiQuery(query);
    setShowAi(true);
    toast.info("AI query processed", { description: query });
  }, []);

  const features = [
    { icon: Zap, title: "Lightning Fast", desc: "Scrape any page in seconds" },
    { icon: Shield, title: "robots.txt Aware", desc: "Respects crawling policies" },
    { icon: Sparkles, title: "AI-Powered", desc: "Semantic understanding of content" },
    { icon: Layers, title: "Multi-Page", desc: "Handle pagination automatically" },
  ];

  return (
    <div className="min-h-screen bg-background bg-mesh relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <img
          src={heroBg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-glow-blue/5 rounded-full blur-3xl" />
      </div>

      <FeatureSidebar
        onAiQuery={handleAiQuery}
        onExport={handleExport}
        hasResult={!!result}
      />

      <main className="relative z-10 pr-0 md:pr-80 transition-all">
        <section className="pt-20 pb-12 px-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
              <Globe className="w-3.5 h-3.5 text-primary" />
              AI-Powered Web Intelligence Platform
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="text-foreground">Scrape</span>{" "}
              <span className="text-gradient">Smarter</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Paste any URL. Our AI extracts, categorizes, and structures web data
              instantly.
            </p>
          </motion.div>

          <GlowInput onSubmit={handleScrape} loading={loading} />

          <AnimatePresence>
            {loading && <ScrapeProgress progress={progress} stage={stage} />}
          </AnimatePresence>
        </section>

        <AnimatePresence>
          {!result && !loading && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-6 pb-16"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="glass rounded-xl p-5 text-center group hover:glow-border transition-all duration-300"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/25 transition-colors">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">
                      {feature.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="text-center text-xs text-muted-foreground mt-8"
              >
                Try:{" "}
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => handleScrape("https://example-shop.com/products")}
                >
                  example-shop.com/products
                </span>
                {" | "}
                <span
                  className="text-primary cursor-pointer hover:underline"
                  onClick={() => handleScrape("https://tech-blog.io/ai-trends")}
                >
                  tech-blog.io/ai-trends
                </span>
              </motion.p>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {result && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-6 pb-16 space-y-6"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CategoryBadge
                    name={result.category.name}
                    confidence={result.category.confidence}
                  />
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">
                      {result.title}
                    </h2>
                    <p className="text-xs text-muted-foreground font-mono">
                      {result.url}
                    </p>
                  </div>
                </div>
                <ViewToggle active={view} onChange={setView} />
              </div>

              <StatsBar data={result} />

              {view === "cards" && <ResultCards data={result} />}
              {view === "table" && <ResultTable data={result} />}
              {view === "json" && <JsonViewer data={result} />}

              <div className="pt-4">
                <button
                  onClick={() => setShowAi(!showAi)}
                  className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mb-4"
                >
                  <Sparkles className="w-4 h-4" />
                  {showAi ? "Hide" : "Show"} AI Enhancement
                </button>
                <AnimatePresence>
                  {showAi && <AiEnhancement data={result} query={aiQuery} />}
                </AnimatePresence>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Index;

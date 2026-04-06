import { useState, type FC } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Layers,
  Zap,
  FileDown,
  GitCompare,
  Bot,
  Eye,
  RefreshCw,
  Settings,
} from "lucide-react";

interface Props {
  onAiQuery: (query: string) => void;
  onExport: (format: string) => void;
  hasResult: boolean;
}

const FeatureSidebar: FC<Props> = ({ onAiQuery, onExport, hasResult }) => {
  const [open, setOpen] = useState(true);
  const [aiQuery, setAiQuery] = useState("");
  const [pageLimit, setPageLimit] = useState(5);

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 glass rounded-l-xl p-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 h-full w-80 glass-strong border-l border-border/50 z-40 overflow-y-auto"
          >
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Controls</h2>
              </div>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bot className="w-4 h-4 text-primary" />
                  AI Semantic Scraping
                </div>
                <textarea
                  value={aiQuery}
                  onChange={(event) => setAiQuery(event.target.value)}
                  placeholder='e.g. "Get all product prices"'
                  className="w-full bg-secondary/50 border border-border/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 resize-none h-20"
                />
                <button
                  onClick={() => aiQuery && onAiQuery(aiQuery)}
                  disabled={!hasResult}
                  className="w-full bg-primary/20 text-primary text-sm py-2 rounded-lg hover:bg-primary/30 transition-colors disabled:opacity-40"
                >
                  <Zap className="w-3.5 h-3.5 inline mr-1.5" />
                  Run AI Query
                </button>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Layers className="w-4 h-4 text-primary" />
                  Pagination Control
                </div>
                <div className="space-y-2">
                  {[
                    "Current page only",
                    "Scrape next page",
                    "Scrape all pages",
                  ].map((option, index) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                    >
                      <input
                        type="radio"
                        name="page-scope"
                        defaultChecked={index === 0}
                        className="accent-primary"
                      />
                      {option}
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Page limit:</span>
                  <input
                    type="number"
                    value={pageLimit}
                    onChange={(event) => setPageLimit(Number(event.target.value))}
                    min={1}
                    max={100}
                    className="w-16 bg-secondary/50 border border-border/50 rounded-lg px-2 py-1 text-sm text-foreground outline-none text-center"
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Eye className="w-4 h-4 text-primary" />
                  Visual Selector
                </div>
                <div className="bg-secondary/30 rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Click elements on the preview to generate CSS selectors
                    automatically.
                  </p>
                  <button
                    disabled={!hasResult}
                    className="mt-2 text-xs text-primary hover:underline disabled:opacity-40"
                  >
                    Open Visual Builder -&gt;
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <RefreshCw className="w-4 h-4 text-primary" />
                  Change Detection
                </div>
                <button
                  disabled={!hasResult}
                  className="w-full bg-secondary/50 text-muted-foreground text-sm py-2 rounded-lg hover:bg-secondary/70 transition-colors disabled:opacity-40"
                >
                  Compare with previous scrape
                </button>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FileDown className="w-4 h-4 text-primary" />
                  Export Data
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["JSON", "CSV", "Excel"].map((format) => (
                    <button
                      key={format}
                      onClick={() => onExport(format)}
                      disabled={!hasResult}
                      className="bg-secondary/50 text-muted-foreground text-xs py-2 rounded-lg hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-40"
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GitCompare className="w-4 h-4 text-primary" />
                  Multi-URL Compare
                </div>
                <p className="text-xs text-muted-foreground">
                  Scrape multiple URLs to compare content, prices, and structure
                  side by side.
                </p>
              </section>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeatureSidebar;

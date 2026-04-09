import { motion } from "framer-motion";
import type { FC } from "react";
import { Layers3, MoveRight, ScrollText } from "lucide-react";

import type { PaginationMode } from "@/lib/scrape";

interface Props {
  mode: PaginationMode;
  pageLimit: number;
  enableInfiniteScroll: boolean;
  disabled?: boolean;
  onModeChange: (value: PaginationMode) => void;
  onPageLimitChange: (value: number) => void;
  onInfiniteScrollChange: (value: boolean) => void;
}

const modes: Array<{
  value: PaginationMode;
  label: string;
  helper: string;
  icon: typeof ScrollText;
}> = [
  {
    value: "current",
    label: "Current page",
    helper: "Render just the page you entered",
    icon: ScrollText,
  },
  {
    value: "next",
    label: "Current + next",
    helper: "Follow one additional page when found",
    icon: MoveRight,
  },
  {
    value: "all",
    label: "All pages",
    helper: "Follow pagination up to your limit",
    icon: Layers3,
  },
];

const PaginationControls: FC<Props> = ({
  mode,
  pageLimit,
  enableInfiniteScroll,
  disabled,
  onModeChange,
  onPageLimitChange,
  onInfiniteScrollChange,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass rounded-2xl p-4 mt-4 max-w-4xl mx-auto"
  >
    <div className="grid gap-4 lg:grid-cols-[1.4fr,0.8fr,0.8fr]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Pagination mode
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((item) => (
            <button
              key={item.value}
              type="button"
              disabled={disabled}
              onClick={() => onModeChange(item.value)}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                mode === item.value
                  ? "border-primary/60 bg-primary/10"
                  : "border-border/60 bg-secondary/20 hover:bg-secondary/35"
              } disabled:opacity-60`}
            >
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{item.helper}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Page limit
        </label>
        <div className="rounded-xl border border-border/60 bg-secondary/20 px-4 py-3">
          <input
            type="number"
            min={1}
            max={10}
            step={1}
            value={pageLimit}
            disabled={disabled || mode !== "all"}
            onChange={(event) => onPageLimitChange(Number(event.target.value))}
            className="w-full bg-transparent outline-none text-foreground text-lg"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Used when scraping every detected page.
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
          Infinite scroll
        </label>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onInfiniteScrollChange(!enableInfiniteScroll)}
          className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
            enableInfiniteScroll
              ? "border-primary/60 bg-primary/10"
              : "border-border/60 bg-secondary/20 hover:bg-secondary/35"
          } disabled:opacity-60`}
        >
          <p className="text-sm font-medium text-foreground">
            {enableInfiniteScroll ? "Enabled" : "Disabled"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Scroll and expand lazy-loaded content before extraction.
          </p>
        </button>
      </div>
    </div>
  </motion.div>
);

export default PaginationControls;

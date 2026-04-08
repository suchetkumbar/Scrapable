import { motion } from "framer-motion";
import type { FC } from "react";
import { Sparkles } from "lucide-react";

import type { ClassificationResult } from "@/lib/scrape";

interface Props {
  classification: ClassificationResult;
}

const ClassificationPanel: FC<Props> = ({ classification }) => {
  const confidence = Math.round(classification.confidence * 100);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5"
    >
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Phase 3 categorization
          </div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground mt-4">
            Detected website type
          </p>
          <h3 className="text-2xl font-semibold text-foreground mt-2">
            {classification.label}
          </h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Structural heuristics and local semantic scoring agree with
            <span className="text-foreground font-medium"> {confidence}% confidence</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-full xl:min-w-[360px]">
          <Metric label="Confidence" value={`${confidence}%`} />
          <Metric label="Heuristic" value={classification.heuristicScore.toFixed(1)} />
          <Metric label="Semantic" value={classification.semanticScore.toFixed(1)} />
        </div>
      </div>

      {classification.rationale.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Top signals
          </p>
          <div className="flex flex-wrap gap-2">
            {classification.rationale.map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-secondary/55 px-3 py-1.5 text-xs text-foreground"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>
      )}

      {classification.alternatives.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Nearby matches
          </p>
          <div className="flex flex-wrap gap-2">
            {classification.alternatives.map((candidate) => (
              <span
                key={candidate.key}
                className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground"
              >
                {candidate.label} {Math.round(candidate.confidence * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.section>
  );
};

interface MetricProps {
  label: string;
  value: string;
}

const Metric: FC<MetricProps> = ({ label, value }) => (
  <div className="rounded-xl border border-border/60 bg-secondary/30 px-4 py-3">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-semibold text-foreground mt-1">{value}</p>
  </div>
);

export default ClassificationPanel;

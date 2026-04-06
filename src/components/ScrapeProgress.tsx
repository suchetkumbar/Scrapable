import { motion } from "framer-motion";
import type { FC } from "react";

interface Props {
  progress: number;
  stage: string;
}

const ScrapeProgress: FC<Props> = ({ progress, stage }) => (
  <motion.div
    initial={{ opacity: 0, height: 0 }}
    animate={{ opacity: 1, height: "auto" }}
    exit={{ opacity: 0, height: 0 }}
    className="w-full max-w-2xl mx-auto mt-6"
  >
    <div className="glass rounded-xl p-5">
      <div className="flex justify-between text-sm mb-3">
        <span className="text-muted-foreground">{stage}</span>
        <span className="text-primary font-mono">{progress}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-glow-blue rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <div className="flex gap-4 mt-3">
        {["Fetching", "Parsing", "AI Analysis", "Structuring"].map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <div className={`w-2 h-2 rounded-full ${progress > i * 25 ? "bg-primary" : "bg-secondary"}`} />
            <span className={progress > i * 25 ? "text-foreground" : "text-muted-foreground"}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  </motion.div>
);

export default ScrapeProgress;

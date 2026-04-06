import { motion } from "framer-motion";
import type { FC } from "react";
import type { ScrapeResult } from "@/lib/mock-data";
import { Clock, Link2, Image, Type, FileText } from "lucide-react";

interface Props { data: ScrapeResult }

const StatsBar: FC<Props> = ({ data }) => {
  const stats = [
    { icon: Type, label: "Headings", value: data.headings.length },
    { icon: FileText, label: "Paragraphs", value: data.paragraphs.length },
    { icon: Link2, label: "Links", value: data.links.length },
    { icon: Image, label: "Images", value: data.images.length },
    { icon: Clock, label: "Scraped", value: new Date(data.scrapedAt).toLocaleTimeString() },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-2 sm:grid-cols-5 gap-3"
    >
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl px-4 py-3 flex items-center gap-3"
        >
          <s.icon className="w-4 h-4 text-primary shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-sm font-semibold text-foreground font-mono">{s.value}</p>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default StatsBar;

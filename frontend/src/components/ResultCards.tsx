import { motion } from "framer-motion";
import type { FC } from "react";
import type { ScrapeResult } from "@/lib/mock-data";
import { ExternalLink, Image, Type, Link2 } from "lucide-react";

interface Props {
  data: ScrapeResult;
}

const ResultCards: FC<Props> = ({ data }) => {
  const cards = [
    { icon: Type, label: "Headings", count: data.headings.length, items: data.headings },
    { icon: ExternalLink, label: "Links", count: data.links.length, items: data.links.map((l) => l.text) },
    { icon: Image, label: "Images", count: data.images.length, items: data.images.map((i) => i.alt) },
    { icon: Link2, label: "Paragraphs", count: data.paragraphs.length, items: data.paragraphs },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="glass rounded-xl p-5 hover:glow-border transition-all duration-300 group"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <c.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{c.label}</p>
              <p className="text-xs text-muted-foreground">{c.count} found</p>
            </div>
          </div>
          <div className="space-y-2">
            {c.items.slice(0, 3).map((item, j) => (
              <p key={j} className="text-xs text-muted-foreground truncate bg-secondary/50 rounded-lg px-3 py-2">
                {item}
              </p>
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ResultCards;

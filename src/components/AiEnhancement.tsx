import { motion } from "framer-motion";
import type { FC } from "react";
import { Sparkles } from "lucide-react";
import type { ScrapeResult } from "@/lib/mock-data";

interface Props {
  data: ScrapeResult;
  query?: string;
}

const AiEnhancement: FC<Props> = ({ data, query }) => {
  const summary = `This ${data.category.name.toLowerCase()} page titled "${data.title}" contains ${data.headings.length} sections, ${data.links.length} links, and ${data.images.length} images. ${data.paragraphs[0] || ""}`;

  const entities = [
    { type: "Organization", value: new URL(data.url).hostname },
    { type: "Category", value: data.category.name },
    { type: "Content Sections", value: String(data.headings.length) },
    { type: "Extracted Links", value: String(data.links.length) },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Summary */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Summary</h3>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{summary}</p>
      </div>

      {/* Entities */}
      <div className="glass rounded-xl p-5">
        <h3 className="text-sm font-semibold text-foreground mb-3">Extracted Entities</h3>
        <div className="grid grid-cols-2 gap-3">
          {entities.map((e) => (
            <div key={e.type} className="bg-secondary/40 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">{e.type}</p>
              <p className="text-sm text-foreground font-mono">{e.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI Query Result */}
      {query && (
        <div className="glass rounded-xl p-5 glow-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">AI Query Result</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Query: "{query}"</p>
          <div className="bg-secondary/40 rounded-lg p-3 font-mono text-xs text-foreground">
            {JSON.stringify(
              data.links.slice(0, 3).map((l) => ({ text: l.text, url: l.href })),
              null, 2
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AiEnhancement;

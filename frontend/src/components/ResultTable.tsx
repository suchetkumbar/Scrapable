import { motion } from "framer-motion";
import type { FC } from "react";
import type { ScrapeResult } from "@/lib/mock-data";

interface Props {
  data: ScrapeResult;
}

const ResultTable: FC<Props> = ({ data }) => {
  if (!data.tables.length) return <p className="text-muted-foreground text-sm text-center py-8">No table data extracted.</p>;

  const [headers, ...rows] = data.tables;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-xl overflow-hidden"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50">
              {headers.map((h, i) => (
                <th key={i} className="text-left px-5 py-3.5 text-xs font-semibold text-primary uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                {row.map((cell, j) => (
                  <td key={j} className="px-5 py-3 text-muted-foreground">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

export default ResultTable;

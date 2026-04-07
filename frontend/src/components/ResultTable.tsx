import { motion } from "framer-motion";
import type { FC } from "react";
import type { ScrapeResult } from "@/lib/scrape";

interface Props {
  data: ScrapeResult;
}

const ResultTable: FC<Props> = ({ data }) => {
  if (!data.tables.length) return <p className="text-muted-foreground text-sm text-center py-8">No table data extracted.</p>;

  return (
    <div className="space-y-4">
      {data.tables.map((table, tableIndex) => {
        const [headers, ...rows] = table.rows;

        return (
          <motion.div
            key={`${table.caption || "table"}-${tableIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-border/50">
              <p className="text-sm font-medium text-foreground">
                {table.caption || `Table ${tableIndex + 1}`}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    {headers?.map((header, index) => (
                      <th
                        key={index}
                        className="text-left px-5 py-3.5 text-xs font-semibold text-primary uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                    >
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-5 py-3 text-muted-foreground">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default ResultTable;

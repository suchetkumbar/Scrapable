import type { FC } from "react";
import { LayoutGrid, Table, Code } from "lucide-react";
import { motion } from "framer-motion";

export type View = "cards" | "table" | "json";

interface Props {
  active: View;
  onChange: (v: View) => void;
}

const views: { id: View; icon: typeof LayoutGrid; label: string }[] = [
  { id: "cards", icon: LayoutGrid, label: "Cards" },
  { id: "table", icon: Table, label: "Table" },
  { id: "json", icon: Code, label: "JSON" },
];

const ViewToggle: FC<Props> = ({ active, onChange }) => (
  <div className="glass rounded-xl p-1 flex gap-1">
    {views.map((v) => (
      <button
        key={v.id}
        onClick={() => onChange(v.id)}
        className="relative px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
      >
        {active === v.id && (
          <motion.div
            layoutId="viewToggle"
            className="absolute inset-0 bg-primary/20 rounded-lg"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
        <v.icon className={`w-4 h-4 relative z-10 ${active === v.id ? "text-primary" : "text-muted-foreground"}`} />
        <span className={`relative z-10 ${active === v.id ? "text-foreground" : "text-muted-foreground"}`}>{v.label}</span>
      </button>
    ))}
  </div>
);

export default ViewToggle;

import { motion } from "framer-motion";
import type { FC } from "react";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

interface Props {
  data: unknown;
}

const JsonViewer: FC<Props> = ({ data }) => {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
        <span className="text-xs text-muted-foreground font-mono">JSON Output</span>
        <button onClick={copy} className="text-xs text-primary flex items-center gap-1.5 hover:text-primary/80 transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="p-5 text-xs text-muted-foreground font-mono overflow-x-auto max-h-96 leading-relaxed">
        {json}
      </pre>
    </motion.div>
  );
};

export default JsonViewer;

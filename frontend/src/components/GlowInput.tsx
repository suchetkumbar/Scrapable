import { useState, type FC, type KeyboardEvent } from "react";
import { motion } from "framer-motion";
import { Search, Globe, Loader2 } from "lucide-react";

interface Props {
  onSubmit: (url: string) => void;
  loading?: boolean;
  placeholder?: string;
  buttonLabel?: string;
  loadingLabel?: string;
}

const GlowInput: FC<Props> = ({
  onSubmit,
  loading,
  placeholder = "Paste any URL to start scraping...",
  buttonLabel = "Scrape",
  loadingLabel = "Working...",
}) => {
  const [v, setV] = useState("");
  const [focused, setFocused] = useState(false);

  const submit = () => {
    if (!v.trim() || loading) return;
    let url = v.trim();
    if (!url.startsWith("http")) url = "https://" + url;
    try {
      new URL(url);
      onSubmit(url);
    } catch {
      /* invalid */
    }
  };

  const onKey = (e: KeyboardEvent) => e.key === "Enter" && submit();

  return (
    <motion.div
      className={`relative w-full max-w-2xl mx-auto rounded-2xl transition-all duration-500 ${focused ? "glow-border-active" : "glow-border"}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="glass-strong rounded-2xl flex items-center gap-3 px-5 py-4">
        <Globe className="w-5 h-5 text-primary shrink-0" />
        <input
          type="text"
          value={v}
          onChange={(e) => setV(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={onKey}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground text-lg"
          disabled={loading}
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={submit}
          disabled={loading || !v.trim()}
          className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium text-sm disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {loading ? loadingLabel : buttonLabel}
        </motion.button>
      </div>
    </motion.div>
  );
};

export default GlowInput;

import { motion } from "framer-motion";
import type { FC } from "react";
import { ShoppingCart, FileText, Newspaper, Video, Briefcase, GraduationCap, BookOpen, Users, Globe } from "lucide-react";

const ICONS: Record<string, typeof Globe> = {
  "E-commerce": ShoppingCart, Blog: FileText, News: Newspaper,
  Video: Video, "Job Portal": Briefcase, Academic: GraduationCap,
  Documentation: BookOpen, "Social Media": Users, Other: Globe,
};

interface Props {
  name: string;
  confidence: number;
}

const CategoryBadge: FC<Props> = ({ name, confidence }) => {
  const Icon = ICONS[name] || Globe;
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="glass rounded-xl px-4 py-3 flex items-center gap-3 glow-border"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">
          Confidence: <span className="text-primary font-mono">{(confidence * 100).toFixed(0)}%</span>
        </p>
      </div>
    </motion.div>
  );
};

export default CategoryBadge;

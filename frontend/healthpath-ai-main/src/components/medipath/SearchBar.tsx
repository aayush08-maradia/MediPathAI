import { useState, FormEvent } from "react";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Props = {
  onSearch: (q: string) => void;
  initial?: string;
  compact?: boolean;
};

export const SearchBar = ({ onSearch, initial = "", compact = false }: Props) => {
  const [q, setQ] = useState(initial);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (q.trim()) onSearch(q.trim());
  };

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative w-full ${compact ? "max-w-3xl" : "max-w-3xl"}`}
    >
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-primary opacity-0 group-focus-within:opacity-20 blur-xl rounded-2xl transition-opacity duration-500" />
        <div className="relative flex items-center gap-2 bg-card border border-border rounded-2xl shadow-soft hover:shadow-medium focus-within:shadow-medium focus-within:border-primary/50 transition-all duration-300 pl-5 pr-2 py-2">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Describe your symptoms or procedure in Hindi or English…"
            className={`flex-1 bg-transparent outline-none border-none ${compact ? "py-2 text-base" : "py-4 text-lg"} text-foreground placeholder:text-muted-foreground`}
          />
          <Button type="submit" size={compact ? "default" : "lg"} className="bg-gradient-primary hover:opacity-90 shadow-soft rounded-xl gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Find Care</span>
          </Button>
        </div>
      </div>
    </motion.form>
  );
};
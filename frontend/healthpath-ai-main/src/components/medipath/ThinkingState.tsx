import { motion } from "framer-motion";
import { Brain, Stethoscope, Building2, Calculator } from "lucide-react";

const steps = [
  { icon: Brain, label: "Understanding your query…" },
  { icon: Stethoscope, label: "Mapping to medical condition (ICD-10)…" },
  { icon: Building2, label: "Searching nearby hospitals…" },
  { icon: Calculator, label: "Estimating costs…" },
];

export const ThinkingState = () => (
  <div className="flex flex-col items-center justify-center py-20 gap-10">
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-primary rounded-full animate-pulse-ring" />
      <div className="absolute inset-0 bg-gradient-primary rounded-full animate-pulse-ring" style={{ animationDelay: "0.6s" }} />
      <div className="relative w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
        <Brain className="w-11 h-11 text-primary-foreground" />
      </div>
    </div>
    <div className="text-center space-y-2">
      <h2 className="text-2xl font-semibold text-foreground">AI is thinking…</h2>
      <p className="text-muted-foreground">Analyzing your query with medical knowledge graphs</p>
    </div>
    <div className="w-full max-w-md space-y-3">
      {steps.map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.35, duration: 0.4 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border shadow-soft relative overflow-hidden"
        >
          <div className="absolute inset-0 animate-shimmer" />
          <div className="relative w-9 h-9 rounded-lg bg-secondary flex items-center justify-center">
            <s.icon className="w-4 h-4 text-primary" />
          </div>
          <span className="relative text-sm text-foreground">{s.label}</span>
        </motion.div>
      ))}
    </div>
  </div>
);
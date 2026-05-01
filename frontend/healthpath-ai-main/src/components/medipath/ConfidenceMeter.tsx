import { motion } from "framer-motion";

export const ConfidenceMeter = ({ value }: { value: number }) => {
  const color =
    value >= 85 ? "hsl(var(--success))" : value >= 65 ? "hsl(var(--primary))" : "hsl(var(--warning))";
  const label = value >= 85 ? "High confidence" : value >= 65 ? "Moderate confidence" : "Low confidence";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">AI confidence</span>
        <span className="font-semibold text-foreground">{value}%</span>
      </div>
      <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: color }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
};
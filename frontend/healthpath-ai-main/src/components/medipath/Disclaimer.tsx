import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export const Disclaimer = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.8 }}
    className="flex gap-4 p-5 rounded-2xl border border-warning/30 bg-warning/5"
  >
    <div className="shrink-0 w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
      <AlertTriangle className="w-5 h-5 text-warning" />
    </div>
    <div className="text-sm text-foreground/80 leading-relaxed">
      <p className="font-semibold text-foreground mb-1">Medical Disclaimer</p>
      MediPath AI provides informational estimates only and is <strong>not a substitute for professional medical advice, diagnosis, or treatment</strong>. Always consult a qualified physician for health concerns. Hospital costs are indicative and may vary based on individual case complexity, insurance, and chosen treatment plan.
    </div>
  </motion.div>
);
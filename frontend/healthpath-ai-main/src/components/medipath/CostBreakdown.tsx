import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Receipt, CheckCircle2 } from "lucide-react";
import { SearchOutput, formatINR } from "@/services/hospitalService";

export const CostBreakdown = ({ result }: { result: SearchOutput }) => {
  const b = {
    procedureMin: result.condition.base.min,
    procedureMax: result.condition.base.max,
    stayDays: result.condition.base.stayDays,
    perDay: result.condition.base.perDay,
    diagnostics: result.condition.base.diagnostics,
    medicines: result.condition.base.medicines,
    contingencyPct: result.condition.base.contingencyPct,
  };
  const stayCost = b.stayDays * b.perDay;
  const subtotalMin = b.procedureMin + stayCost + b.diagnostics + b.medicines;
  const subtotalMax = b.procedureMax + stayCost + b.diagnostics + b.medicines;
  const buffMin = Math.round((subtotalMin * b.contingencyPct) / 100);
  const buffMax = Math.round((subtotalMax * b.contingencyPct) / 100);
  const totalMin = subtotalMin + buffMin;
  const totalMax = subtotalMax + buffMax;

  const rows: { label: string; value: string }[] = [
    { label: "Procedure cost", value: `${formatINR(b.procedureMin)} – ${formatINR(b.procedureMax)}` },
    ...(b.stayDays > 0
      ? [{ label: `Hospital stay (${b.stayDays} days × ${formatINR(b.perDay)}/day)`, value: formatINR(stayCost) }]
      : []),
    { label: "Diagnostics", value: formatINR(b.diagnostics) },
    { label: "Medicines", value: formatINR(b.medicines) },
    { label: `Contingency buffer (${b.contingencyPct}%)`, value: `${formatINR(buffMin)} – ${formatINR(buffMax)}` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
    >
      <Accordion type="single" collapsible defaultValue="cost" className="bg-card border border-border rounded-2xl shadow-soft overflow-hidden">
        <AccordionItem value="cost" className="border-0">
          <AccordionTrigger className="px-6 py-4 hover:no-underline">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Cost Breakdown</h3>
                <p className="text-xs text-muted-foreground">Transparent estimate based on tier averages</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <div className="space-y-3 mt-2">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between py-2 border-b border-dashed border-border last:border-0">
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                  <span className="text-sm font-medium text-foreground">{r.value}</span>
                </div>
              ))}
              <div className="mt-4 p-4 rounded-xl bg-gradient-soft border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Total estimate</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatINR(totalMin)} – {formatINR(totalMax)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--success))] font-medium px-2.5 py-1 rounded-full bg-success/10">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {result.condition.confidence}% confident
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </motion.div>
  );
};
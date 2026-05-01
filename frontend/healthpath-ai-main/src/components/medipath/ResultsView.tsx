import { useState } from "react";
import { motion } from "framer-motion";
import { Stethoscope, Activity, Frown, ArrowLeft, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { HospitalCard } from "./HospitalCard";
import { CostBreakdown } from "./CostBreakdown";
import { Disclaimer } from "./Disclaimer";
import { FilterPanel } from "./FilterPanel";
import { HospitalDetailsDialog } from "./HospitalDetailsDialog";
import { EnrichedHospital, SearchOutput, SearchFilters } from "@/services/hospitalService";

type Props = {
  result: SearchOutput;
  filters: SearchFilters;
  onFiltersChange: (f: SearchFilters) => void;
  locationLabel: string;
  symptom?: string;
  onBack?: () => void;
};

export const ResultsView = ({ result, filters, onFiltersChange, locationLabel, symptom, onBack }: Props) => {
  const [selected, setSelected] = useState<EnrichedHospital | null>(null);
  const [open, setOpen] = useState(false);
  const openDetails = (h: EnrichedHospital) => {
    setSelected(h);
    setOpen(true);
  };

  return (
  <div className="space-y-8">
    {/* Navigation Buttons */}
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center gap-2 mb-4 flex-wrap"
    >
      {onBack && (
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      )}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card hover:bg-secondary border border-border rounded-lg transition-all duration-200"
      >
        <Edit2 className="w-4 h-4" />
        New Search
      </button>
    </motion.div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-6 shadow-soft"
    >
      <div className="grid md:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-secondary border-primary/20 text-primary gap-1.5">
              <Stethoscope className="w-3 h-3" />
              Detected condition
            </Badge>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-0 font-mono">
              ICD-10 · {result.condition.icd10}
            </Badge>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{result.condition.condition}</h2>
          {symptom && (
            <div className="flex flex-col gap-1.5 text-sm p-3 bg-secondary/30 rounded-lg border border-border/50">
              <span className="font-medium text-foreground">Your symptom:</span>
              <span className="italic text-muted-foreground">"{symptom}"</span>
            </div>
          )}
          <div className="flex items-start gap-2 text-muted-foreground">
            <Activity className="w-4 h-4 mt-1 shrink-0 text-teal" />
            <p>
              <span className="text-foreground font-medium">Recommended:</span> {result.condition.procedure}
            </p>
          </div>
        </div>
        <div className="md:w-64 w-full">
          <ConfidenceMeter value={result.condition.confidence} />
        </div>
      </div>
    </motion.div>

    <div className="grid lg:grid-cols-[280px_1fr] gap-6">
      <FilterPanel filters={filters} onChange={onFiltersChange} resultCount={result.hospitals.length} />

      <div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-baseline justify-between mb-4 flex-wrap gap-2"
        >
          <h3 className="text-lg font-semibold text-foreground">
            {result.hospitals.length} hospital{result.hospitals.length === 1 ? "" : "s"} near {locationLabel}
          </h3>
          <span className="text-xs text-muted-foreground">
            within {filters.radiusKm} km · sorted by {filters.sortBy}
          </span>
        </motion.div>

        {result.hospitals.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-10 text-center">
            <Frown className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground">No hospitals match these filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try widening the radius or relaxing filters.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {result.hospitals.map((h, i) => (
              <HospitalCard key={h.id} hospital={h} index={i} onViewDetails={openDetails} />
            ))}
          </div>
        )}
      </div>
    </div>

    <CostBreakdown result={result} />
    <Disclaimer />
    <HospitalDetailsDialog hospital={selected} open={open} onOpenChange={setOpen} />
  </div>
  );
};
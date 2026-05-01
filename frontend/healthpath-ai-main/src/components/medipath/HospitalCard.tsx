import { motion } from "framer-motion";
import { MapPin, Star, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnrichedHospital, Tier, formatINR } from "@/services/hospitalService";

const tierStyles: Record<Tier, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  "Mid-tier": "bg-teal/10 text-teal border-teal/20",
  Budget: "bg-success/10 text-[hsl(var(--success))] border-success/20",
};

type Props = {
  hospital: EnrichedHospital;
  index: number;
  onViewDetails?: (h: EnrichedHospital) => void;
};

export const HospitalCard = ({ hospital, index, onViewDetails }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: Math.min(0.05 * index, 0.5) }}
    whileHover={{ y: -4 }}
    className="group relative bg-card border border-border rounded-2xl p-5 shadow-soft hover:shadow-medium transition-all duration-300 flex flex-col"
  >
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="font-semibold text-lg text-foreground leading-tight truncate">{hospital.name}</h3>
        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
          <MapPin className="w-3.5 h-3.5" />
          <span>{hospital.city}</span>
          <span>•</span>
          <span>{hospital.distanceKm} km</span>
        </div>
      </div>
      <Badge variant="outline" className={tierStyles[hospital.tier]}>
        {hospital.tier}
      </Badge>
    </div>

    <div className="flex items-center gap-3 mb-4">
      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary">
        <Star className="w-3.5 h-3.5 fill-warning text-warning" />
        <span className="text-sm font-medium text-foreground">{hospital.rating}</span>
        <span className="text-xs text-muted-foreground">/5</span>
      </div>
      <span className="text-xs text-muted-foreground">{hospital.reviews.toLocaleString()} reviews</span>
      {hospital.nabh && (
        <div className="ml-auto flex items-center gap-1 text-xs text-teal font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          NABH
        </div>
      )}
    </div>

    <div className="mt-auto space-y-3">
      <div className="p-3 rounded-xl bg-gradient-soft border border-border/60">
        <p className="text-xs text-muted-foreground mb-0.5">Estimated cost</p>
        <p className="font-bold text-lg text-foreground">
          {formatINR(hospital.costMin)} – {formatINR(hospital.costMax)}
        </p>
      </div>
      <Button
        variant="outline"
        onClick={() => onViewDetails?.(hospital)}
        className="w-full justify-between group-hover:border-primary group-hover:text-primary"
      >
        View Details
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  </motion.div>
);
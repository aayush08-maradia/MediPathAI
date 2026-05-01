import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Star, ShieldCheck, Navigation, Stethoscope, IndianRupee, BedDouble, Calendar, X } from "lucide-react";
import { EnrichedHospital, Tier, formatINR } from "@/services/hospitalService";

const tierStyles: Record<Tier, string> = {
  Premium: "bg-primary/10 text-primary border-primary/20",
  "Mid-tier": "bg-teal/10 text-teal border-teal/20",
  Budget: "bg-success/10 text-[hsl(var(--success))] border-success/20",
};

type Props = {
  hospital: EnrichedHospital | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export const HospitalDetailsDialog = ({ hospital, open, onOpenChange }: Props) => {
  if (!hospital) return null;
  const stayCost = hospital.stayDays * hospital.perDay;
  const destination = `${hospital.lat},${hospital.lng}`;
  const query = encodeURIComponent(`${hospital.name}, ${hospital.city}, ${hospital.state}`);
  // Universal Google Maps directions URL — works on web, Android & iOS
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;
  const searchUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
  const openDirections = (e?: React.MouseEvent) => {
    e?.preventDefault();
    // Try opening directions; if popup is blocked, fall back to same-tab navigation
    const win = window.open(mapsUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = mapsUrl;
  };
  const openOnMap = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const win = window.open(searchUrl, "_blank", "noopener,noreferrer");
    if (!win) window.location.href = searchUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-xl md:text-2xl text-left leading-tight">
                {hospital.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1 text-left">
                <MapPin className="w-3.5 h-3.5" />
                {hospital.city}, {hospital.state} · {hospital.distanceKm} km away
              </DialogDescription>
            </div>
            <Badge variant="outline" className={tierStyles[hospital.tier]}>{hospital.tier}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-secondary">
              <Star className="w-3.5 h-3.5 fill-warning text-warning" />
              <span className="text-sm font-semibold text-foreground">{hospital.rating}</span>
              <span className="text-xs text-muted-foreground">/ 5 · {hospital.reviews.toLocaleString()} reviews</span>
            </div>
            {hospital.nabh && (
              <Badge variant="outline" className="bg-teal/10 text-teal border-teal/20 gap-1">
                <ShieldCheck className="w-3 h-3" /> NABH-accredited
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-5 mt-2">
          {/* Specialties */}
          <section>
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5" /> Specialties
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {hospital.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="capitalize text-xs">{s}</Badge>
              ))}
            </div>
          </section>

          {/* Cost details */}
          <section className="rounded-xl border border-border bg-gradient-soft p-4">
            <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5" /> Estimated cost at this hospital
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Procedure range</p>
                <p className="font-semibold text-foreground">{formatINR(hospital.costMin)} – {formatINR(hospital.costMax)}</p>
              </div>
              {hospital.stayDays > 0 && (
                <>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><BedDouble className="w-3 h-3" /> Per day stay</p>
                    <p className="font-semibold text-foreground">{formatINR(hospital.perDay)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Avg stay</p>
                    <p className="font-semibold text-foreground">{hospital.stayDays} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Total stay cost</p>
                    <p className="font-semibold text-foreground">{formatINR(stayCost)}</p>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Coordinates */}
          <section className="text-xs text-muted-foreground">
            <p>Coordinates: <span className="font-mono">{hospital.lat.toFixed(4)}, {hospital.lng.toFixed(4)}</span></p>
            <p>Hospital ID: <span className="font-mono">{hospital.id}</span></p>
          </section>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button asChild className="flex-1 gap-2">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={openDirections}>
                <Navigation className="w-4 h-4" /> Get directions
              </a>
            </Button>
            <Button asChild variant="outline" className="flex-1 gap-2">
              <a href={searchUrl} target="_blank" rel="noopener noreferrer" onClick={openOnMap}>
                <MapPin className="w-4 h-4" /> View on map
              </a>
            </Button>
            <Button variant="ghost" className="sm:w-auto gap-2" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
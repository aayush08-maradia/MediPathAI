import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchFilters, Tier, defaultFilters, formatINR } from "@/services/hospitalService";

const ALL_TIERS: Tier[] = ["Premium", "Mid-tier", "Budget"];

type Props = {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  resultCount: number;
};

export const FilterPanel = ({ filters, onChange, resultCount }: Props) => {
  const update = <K extends keyof SearchFilters>(k: K, v: SearchFilters[K]) =>
    onChange({ ...filters, [k]: v });

  const toggleTier = (t: Tier) => {
    const has = filters.tiers.includes(t);
    update("tiers", has ? filters.tiers.filter((x) => x !== t) : [...filters.tiers, t]);
  };

  return (
    <aside className="bg-card border border-border rounded-2xl p-5 shadow-soft sticky top-24 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>
        <button
          onClick={() => onChange(defaultFilters)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="text-xs text-muted-foreground">
        <span className="font-semibold text-primary">{resultCount}</span> hospitals match
      </div>

      {/* Radius */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Radius</span>
          <span className="text-primary font-semibold">{filters.radiusKm} km</span>
        </div>
        <Slider
          value={[filters.radiusKm]}
          min={5}
          max={100}
          step={5}
          onValueChange={(v) => update("radiusKm", v[0])}
        />
      </div>

      {/* Tier */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Hospital tier</p>
        <div className="space-y-1.5">
          {ALL_TIERS.map((t) => (
            <label key={t} className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              <Checkbox
                checked={filters.tiers.includes(t)}
                onCheckedChange={() => toggleTier(t)}
              />
              {t}
            </label>
          ))}
        </div>
      </div>

      {/* NABH */}
      <label className="flex items-center gap-2 cursor-pointer text-sm text-foreground">
        <Checkbox
          checked={filters.nabhOnly}
          onCheckedChange={(c) => update("nabhOnly", Boolean(c))}
        />
        NABH-accredited only
      </label>

      {/* Min rating */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Min rating</span>
          <span className="text-primary font-semibold">{filters.minRating.toFixed(1)}★</span>
        </div>
        <Slider
          value={[filters.minRating]}
          min={0}
          max={5}
          step={0.5}
          onValueChange={(v) => update("minRating", v[0])}
        />
      </div>

      {/* Max budget */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-foreground font-medium">Max budget</span>
          <span className="text-primary font-semibold">
            {filters.maxBudget == null ? "No limit" : formatINR(filters.maxBudget)}
          </span>
        </div>
        <Slider
          value={[filters.maxBudget ?? 600000]}
          min={5000}
          max={600000}
          step={5000}
          onValueChange={(v) => update("maxBudget", v[0] >= 600000 ? null : v[0])}
        />
      </div>

      {/* Sort */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Sort by</p>
        <Select value={filters.sortBy} onValueChange={(v) => update("sortBy", v as SearchFilters["sortBy"])}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Nearest first</SelectItem>
            <SelectItem value="cost">Lowest cost</SelectItem>
            <SelectItem value="rating">Highest rated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button variant="outline" size="sm" className="w-full" onClick={() => onChange(defaultFilters)}>
        Reset all filters
      </Button>
    </aside>
  );
};
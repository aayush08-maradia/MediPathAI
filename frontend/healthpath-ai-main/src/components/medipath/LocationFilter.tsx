import { MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CITY_COORDS, STATES_WITH_CITIES, loadCitiesFromHospitals } from "@/services/hospitalService";

export type LocationValue = {
  state: string;
  city: string;
  lat: number;
  lng: number;
  source: "city" | "geo";
};

type Props = {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
};

export const LocationFilter = ({ value, onChange }: Props) => {
  const [, setReloadTrigger] = useState(0);
  
  // Force re-render when cities load
  useEffect(() => {
    loadCitiesFromHospitals().then(() => {
      setReloadTrigger(t => t + 1);
    });
  }, []);

  const cities = STATES_WITH_CITIES[value.state] ?? [];

  const setState = (state: string) => {
    const firstCity = STATES_WITH_CITIES[state][0];
    const c = CITY_COORDS[firstCity];
    onChange({ state, city: firstCity, lat: c.lat, lng: c.lng, source: "city" });
  };

  const setCity = (city: string) => {
    const c = CITY_COORDS[city];
    onChange({ state: value.state, city, lat: c.lat, lng: c.lng, source: "city" });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-card border border-border rounded-2xl shadow-soft">
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground pl-1">
        <MapPin className="w-4 h-4 text-primary" />
        Location
      </div>
      <Select value={value.state} onValueChange={setState}>
        <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {Object.keys(STATES_WITH_CITIES).map((s) => (
            <SelectItem key={s} value={s}>{s}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={value.city} onValueChange={setCity}>
        <SelectTrigger className="w-[160px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c} value={c}>{c}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.source === "geo" && (
        <span className="text-[11px] text-teal font-medium">📍 GPS · {value.city}</span>
      )}
    </div>
  );
};
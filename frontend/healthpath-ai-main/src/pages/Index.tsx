import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Languages, IndianRupee, ShieldCheck } from "lucide-react";
import { Header } from "@/components/medipath/Header";
import { SearchBar } from "@/components/medipath/SearchBar";
import { ThinkingState } from "@/components/medipath/ThinkingState";
import { ResultsView } from "@/components/medipath/ResultsView";
import { LocationFilter, LocationValue } from "@/components/medipath/LocationFilter";
import {
  findHospitals,
  defaultFilters,
  SearchFilters,
  SearchOutput,
  CITY_COORDS,
  loadCitiesFromHospitals,
} from "@/services/hospitalService";
import { useAuth } from "@/context/AuthContext";
import bgAbstract from "@/assets/bg-abstract.jpg";

type Stage = "home" | "loading" | "results";

const features = [
  { icon: Languages, label: "Hindi & English" },
  { icon: IndianRupee, label: "Transparent costs" },
  { icon: ShieldCheck, label: "NABH-verified" },
];

const exampleQueries = [
  "chest pain while walking",
  "knee replacement",
  "best cancer hospital",
  "सीने में दर्द चलते समय",
];

const initialLocation = (): LocationValue => {
  // Safe fallback: use Surat with hardcoded coords if CITY_COORDS not loaded yet
  const c = CITY_COORDS["Surat"] || { lat: 21.1702, lng: 72.8311, state: "Gujarat" };
  return { state: c.state || "Gujarat", city: "Surat", lat: c.lat, lng: c.lng, source: "city" };
};

const Index = () => {
  const { user } = useAuth();
  const [stage, setStage] = useState<Stage>("home");
  const [result, setResult] = useState<SearchOutput | null>(null);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState<LocationValue>(initialLocation);
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);

  // Load cities on component mount
  useEffect(() => {
    loadCitiesFromHospitals();
  }, []);

  const locationLabel = useMemo(
    () => (location.source === "geo" ? "your location" : `${location.city}, ${location.state}`),
    [location]
  );

  const runSearch = async (q: string) => {
    setQuery(q);
    setStage("loading");
    // brief artificial delay so the "AI thinking" state is visible
    setTimeout(async () => {
      const out = await findHospitals({
        query: q,
        origin: { lat: location.lat, lng: location.lng },
        filters,
      });
      setResult(out);
      setStage("results");
    }, 1500);
  };

  // Re-run search reactively whenever filters or location change while on results
  useEffect(() => {
    if (stage !== "results" || !query) return;
    let cancelled = false;
    findHospitals({
      query,
      origin: { lat: location.lat, lng: location.lng },
      filters,
    }).then((out) => {
      if (!cancelled) setResult(out);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, location.lat, location.lng]);

  const reset = () => {
    setStage("home");
    setResult(null);
    setQuery("");
    setFilters(defaultFilters);
  };

  return (
    <div className="min-h-screen bg-gradient-hero relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.06] mix-blend-multiply"
        style={{ backgroundImage: `url(${bgAbstract})` }}
      />
      <Header onLogoClick={reset} />

      <main className="container py-10 md:py-14">
        <AnimatePresence mode="wait">
          {stage === "home" && (
            <motion.section
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center text-center pt-8 md:pt-16"
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-primary/15 text-xs font-medium text-primary mb-6"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {user ? `Welcome, ${user.name.split(" ")[0]} · MediPath ID ${user.id}` : "AI-powered healthcare guidance for India"}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="text-4xl md:text-6xl font-bold text-foreground tracking-tight max-w-3xl"
              >
                Find the right care, at the
                <span className="block bg-gradient-to-r from-primary to-teal bg-clip-text text-transparent">
                  right hospital, at the right cost.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground text-base md:text-lg mt-5 max-w-2xl"
              >
                Describe your symptoms or procedure in plain Hindi or English. MediPath AI maps it to a medical condition and shows nearby hospitals with transparent cost estimates.
              </motion.p>

              <div className="w-full mt-10 flex flex-col items-center gap-3">
                <SearchBar onSearch={runSearch} />
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Try:</span>
                {exampleQueries.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => runSearch(ex)}
                    className="px-3 py-1.5 text-xs rounded-full bg-card border border-border text-foreground/80 hover:border-primary/40 hover:text-primary hover:shadow-soft transition-all"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div className="mt-12 flex flex-wrap items-center justify-center gap-6">
                {features.map((f) => (
                  <div key={f.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <f.icon className="w-4 h-4 text-teal" />
                    {f.label}
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {stage === "loading" && (
            <motion.section
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-3xl mx-auto"
            >
              <SearchBar onSearch={runSearch} initial={query} compact />
              <ThinkingState />
            </motion.section>
          )}

          {stage === "results" && result && (
            <motion.section
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-7xl mx-auto space-y-6"
            >
              <SearchBar onSearch={runSearch} initial={query} compact />
              <LocationFilter value={location} onChange={setLocation} />
              <ResultsView
                result={result}
                filters={filters}
                onFiltersChange={setFilters}
                locationLabel={locationLabel}
                symptom={query}
                onBack={reset}
              />
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      <footer className="container py-8 text-center text-xs text-muted-foreground">
        MediPath AI · Hackathon prototype 
      </footer>
    </div>
  );
};

export default Index;

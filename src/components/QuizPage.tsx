import { useState, useCallback, useEffect } from "react";
import type { Continent, QuizMode } from "../data/types";
import { useQuizState } from "../hooks/useQuizState";
import { countries } from "../data/countries";
import { matchCountryName, matchCapital } from "../utils/matching";
import WorldMap from "./WorldMap";
import Sidebar from "./Sidebar";
import ConfettiEffect from "./ConfettiEffect";

interface QuizPageProps {
  mode: QuizMode;
  continent: Continent | null;
  onBack: () => void;
}

export default function QuizPage({ mode, continent, onBack }: QuizPageProps) {
  const {
    filteredCountries,
    found,
    totalFiltered,
    foundFiltered,
    isComplete,
    selectedCountry,
    setSelectedCountry,
    markFound,
  } = useQuizState(mode, continent);

  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [highlightIso, setHighlightIso] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  // Global Escape key handler (works regardless of focus)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedCountry(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setSelectedCountry]);

  // Handle country click on map
  const handleCountryClick = useCallback(
    (iso: string) => {
      if (found.has(iso)) return;

      if (mode === "capitals") {
        setSelectedCountry(iso);
      } else {
        // Countries mode: just flash the country
        setHighlightIso(iso);
      }
    },
    [mode, found, setSelectedCountry]
  );

  // Handle answer submission
  const handleSubmit = useCallback(
    (value: string): boolean => {
      if (mode === "countries") {
        const matchedIso = matchCountryName(value, filteredCountries, found);
        if (matchedIso) {
          markFound(matchedIso);
          setConfettiTrigger((prev) => prev + 1);
          setHighlightIso(matchedIso);
          return true;
        }
        return false;
      } else {
        // Capitals mode
        if (!selectedCountry) return false;
        const country = countries.find((c) => c.iso === selectedCountry);
        if (!country) return false;

        if (matchCapital(value, country)) {
          markFound(selectedCountry);
          setConfettiTrigger((prev) => prev + 1);
          setSelectedCountry(null);
          return true;
        }
        return false;
      }
    },
    [mode, filteredCountries, found, selectedCountry, markFound, setSelectedCountry]
  );

  // Handle hover for tooltip (small countries)
  const handleCountryHover = useCallback(
    (iso: string | null, event?: React.MouseEvent) => {
      if (!iso || !found.has(iso) || !event) {
        setTooltip(null);
        return;
      }
      const country = countries.find((c) => c.iso === iso);
      if (country) {
        const label =
          mode === "countries" ? country.name : country.capital;
        setTooltip({ text: label, x: event.clientX + 12, y: event.clientY - 20 });
      }
    },
    [found, mode]
  );

  // Get selected country name for sidebar
  const selectedCountryName = selectedCountry
    ? countries.find((c) => c.iso === selectedCountry)?.name ?? null
    : null;

  // Show input: always in countries mode, only when selected in capitals mode
  const showInput = mode === "countries" || selectedCountry !== null;

  return (
    <div className="quiz-page">
      <WorldMap
        mode={mode}
        found={found}
        selectedCountry={selectedCountry}
        onCountryClick={handleCountryClick}
        onCountryHover={handleCountryHover}
        highlightIso={highlightIso}
      />
      <Sidebar
        mode={mode}
        continent={continent}
        foundCount={foundFiltered}
        totalCount={totalFiltered}
        isComplete={isComplete}
        selectedCountryName={selectedCountryName}
        onSubmit={handleSubmit}
        onBack={onBack}
        onEscape={() => setSelectedCountry(null)}
        showInput={showInput}
      />
      <ConfettiEffect
        trigger={confettiTrigger}
        prolonged={isComplete}
      />
      {tooltip && (
        <div
          className="country-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

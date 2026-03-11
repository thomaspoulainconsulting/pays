import { useState, useMemo, useCallback } from "react";
import type { Continent, QuizMode, SavedProgress } from "../data/types";
import { useLocalStorage } from "./useLocalStorage";
import { countries } from "../data/countries";

const STORAGE_KEY = "quiz-pays-progress";

const initialProgress: SavedProgress = {
  countries: [],
  capitals: [],
};

export function useQuizState(mode: QuizMode, continent: Continent | null) {
  const [progress, setProgress] = useLocalStorage<SavedProgress>(
    STORAGE_KEY,
    initialProgress
  );
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  // Countries filtered by continent
  const filteredCountries = useMemo(
    () =>
      continent
        ? countries.filter((c) => c.continent === continent)
        : countries,
    [continent]
  );

  // Set of found ISO codes for current mode
  const found = useMemo(
    () => new Set(mode === "countries" ? progress.countries : progress.capitals),
    [mode, progress]
  );

  // Count for current filter
  const totalFiltered = filteredCountries.length;
  const foundFiltered = filteredCountries.filter((c) => found.has(c.iso)).length;
  const isComplete = foundFiltered === totalFiltered;

  // Mark a country as found
  const markFound = useCallback(
    (iso: string) => {
      setProgress((prev) => {
        const key = mode === "countries" ? "countries" : "capitals";
        if (prev[key].includes(iso)) return prev;
        return { ...prev, [key]: [...prev[key], iso] };
      });
    },
    [mode, setProgress]
  );

  return {
    filteredCountries,
    found,
    totalFiltered,
    foundFiltered,
    isComplete,
    selectedCountry,
    setSelectedCountry,
    markFound,
  };
}

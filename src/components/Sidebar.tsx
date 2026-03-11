import type { Continent, QuizMode } from "../data/types";
import { continentLabels } from "../data/continents";
import CountryInput from "./CountryInput";

interface SidebarProps {
  mode: QuizMode;
  continent: Continent | null;
  foundCount: number;
  totalCount: number;
  isComplete: boolean;
  selectedCountryName: string | null; // For capitals mode
  onSubmit: (value: string) => boolean;
  onBack: () => void;
  onEscape?: () => void;
  showInput: boolean;
}

export default function Sidebar({
  mode,
  continent,
  foundCount,
  totalCount,
  isComplete,
  selectedCountryName,
  onSubmit,
  onBack,
  showInput,
}: SidebarProps) {
  const modeLabel = mode === "countries" ? "Pays" : "Capitales";
  const regionLabel = continent ? continentLabels[continent] : "Monde";
  const progressPercent =
    totalCount > 0 ? (foundCount / totalCount) * 100 : 0;

  return (
    <div className="sidebar">
      <div className="sidebar-mode">
        {modeLabel} — {regionLabel}
      </div>

      {isComplete ? (
        <div className="completion-message">
          <h2>Bravo !</h2>
          <p>
            Vous avez trouve {mode === "countries" ? "tous les pays" : "toutes les capitales"} !
          </p>
          <button className="sidebar-back" onClick={onBack}>
            Retour a l'accueil
          </button>
        </div>
      ) : (
        <>
          {mode === "capitals" && selectedCountryName && (
            <div className="sidebar-selected">
              Capitale de : {selectedCountryName}
            </div>
          )}

          {showInput && (
            <CountryInput
              placeholder={
                mode === "countries"
                  ? "Tapez un nom de pays..."
                  : "Quelle est la capitale ?"
              }
              onSubmit={onSubmit}
              autoFocus
            />
          )}

          <div className="sidebar-progress">
            <div className="progress-text">
              {foundCount} / {totalCount} trouves
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button className="sidebar-back" onClick={onBack}>
            Retour a l'accueil
          </button>
        </>
      )}
    </div>
  );
}

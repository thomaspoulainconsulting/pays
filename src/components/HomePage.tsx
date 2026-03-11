import type { Continent, QuizMode } from "../data/types";
import { countries } from "../data/countries";
import ContinentFilter from "./ContinentFilter";

interface HomePageProps {
  onStart: (mode: QuizMode, continent: Continent | null) => void;
}

export default function HomePage({ onStart }: HomePageProps) {
  const totalCountries = countries.length;

  return (
    <div className="home-page">
      <div>
        <h1 className="home-title">Connaissez-vous le monde ?</h1>
        <p className="home-subtitle">Quiz des pays</p>
      </div>

      <div className="home-buttons">
        <div className="home-mode-group">
          <button
            className="home-mode-btn"
            onClick={() => onStart("countries", null)}
          >
            Pays
            <span className="btn-count">{totalCountries} pays</span>
          </button>
          <ContinentFilter
            onSelect={(continent) => onStart("countries", continent)}
          />
        </div>

        <div className="home-mode-group">
          <button
            className="home-mode-btn"
            onClick={() => onStart("capitals", null)}
          >
            Capitales
          </button>
          <ContinentFilter
            onSelect={(continent) => onStart("capitals", continent)}
          />
        </div>
      </div>
    </div>
  );
}

import type { Continent } from "../data/types";
import { allContinents, continentLabels } from "../data/continents";

interface ContinentFilterProps {
  onSelect: (continent: Continent) => void;
}

export default function ContinentFilter({ onSelect }: ContinentFilterProps) {
  return (
    <div className="continent-filters">
      {allContinents.map((c) => (
        <button
          key={c}
          className="continent-btn"
          onClick={() => onSelect(c)}
        >
          {continentLabels[c]}
        </button>
      ))}
    </div>
  );
}

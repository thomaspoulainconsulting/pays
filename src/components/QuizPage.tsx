import type { Continent, QuizMode } from "../data/types";

interface QuizPageProps {
  mode: QuizMode;
  continent: Continent | null;
  onBack: () => void;
}

export default function QuizPage({ mode, continent, onBack }: QuizPageProps) {
  return (
    <div style={{ color: "#e2e8f0", padding: 40 }}>
      <p>Quiz: {mode} — {continent ?? "monde"}</p>
      <button onClick={onBack}>Retour</button>
    </div>
  );
}

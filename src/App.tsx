import { useState } from "react";
import type { Continent, QuizMode } from "./data/types";
import HomePage from "./components/HomePage";
import QuizPage from "./components/QuizPage";

interface QuizParams {
  mode: QuizMode;
  continent: Continent | null;
}

function App() {
  const [quiz, setQuiz] = useState<QuizParams | null>(null);

  if (quiz) {
    return (
      <QuizPage
        mode={quiz.mode}
        continent={quiz.continent}
        onBack={() => setQuiz(null)}
      />
    );
  }

  return (
    <HomePage
      onStart={(mode, continent) => setQuiz({ mode, continent })}
    />
  );
}

export default App;

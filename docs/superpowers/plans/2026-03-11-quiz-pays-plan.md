# Quiz des Pays Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a geography quiz web app where players identify 197 countries and capitals on an interactive SVG world map.

**Architecture:** React + Vite + TypeScript SPA with state-based routing (no router). An SVG world map is pre-processed into path data at build-prep time. Two quiz modes (countries/capitals) with localStorage persistence. Dark geopolitique theme.

**Tech Stack:** React 18, Vite 5, TypeScript 5, canvas-confetti

**Spec:** `docs/superpowers/specs/2026-03-11-quiz-pays-design.md`

**Note on testing:** The spec explicitly defers testing (Vitest) to a future phase. Verification steps use the dev server for visual checks.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/data/types.ts` | All shared TypeScript interfaces and types |
| `src/utils/normalize.ts` | Text normalization (accents, punctuation, casing) |
| `src/utils/matching.ts` | Answer comparison logic using normalize |
| `src/data/countries.ts` | 197 country entries (name, variants, capital, continent, iso) |
| `src/data/continents.ts` | Continent label mapping and helper |
| `src/data/worldPaths.ts` | GENERATED — SVG path data per country |
| `scripts/parse-svg.ts` | Node script to extract SVG paths into worldPaths.ts |
| `src/hooks/useLocalStorage.ts` | Generic localStorage hook with JSON parse/stringify |
| `src/hooks/useQuizState.ts` | Quiz state: found countries, mode, filter, selection |
| `src/styles/index.css` | Global styles, dark geopolitique theme, animations |
| `src/main.tsx` | React entry point |
| `src/App.tsx` | State-based router (home vs quiz) |
| `src/components/HomePage.tsx` | Landing page with title + mode/continent buttons |
| `src/components/ContinentFilter.tsx` | Row of continent filter buttons |
| `src/components/WorldMap.tsx` | SVG map rendering, hover, click, zoom/pan |
| `src/components/Sidebar.tsx` | Side panel: mode label, input, progress, back button |
| `src/components/CountryInput.tsx` | Text input with shake animation |
| `src/components/ConfettiEffect.tsx` | canvas-confetti wrapper |
| `src/components/QuizPage.tsx` | Layout: WorldMap + Sidebar, quiz orchestration |

---

## Chunk 1: Project Scaffold, Data Layer & SVG Pipeline

### Task 1: Initialize Vite + React + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`

- [ ] **Step 1: Scaffold Vite project**

```bash
cd /Users/thomaspoulain/Projets/pays
npm create vite@latest . -- --template react-ts
```

Accept overwriting existing files if prompted. This generates the project skeleton.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 3: Clean generated boilerplate**

Delete `src/App.css`, `src/assets/`, `src/index.css` (we'll recreate it). Strip `src/App.tsx` to a minimal placeholder:

```tsx
function App() {
  return <div>Quiz des Pays</div>;
}

export default App;
```

Strip `src/main.tsx` to:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server starts, page shows "Quiz des Pays" at localhost.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TypeScript project"
git push -u origin main
```

---

### Task 2: Types & Interfaces

**Files:**
- Create: `src/data/types.ts`

- [ ] **Step 1: Create shared types file**

```typescript
export type Continent = "europe" | "afrique" | "asie" | "amerique" | "oceanie";

export type QuizMode = "countries" | "capitals";

export interface Country {
  iso: string;          // ISO 3166-1 alpha-2 lowercase ("fr", "us")
  name: string;         // Primary name in French ("France")
  variants: string[];   // Accepted alternate names (["Republique francaise"])
  capital: string;      // Capital city ("Paris")
  capitalVariants: string[]; // Accepted alternate capital names
  continent: Continent;
}

export interface SvgPath {
  id: string;        // ISO alpha-2 lowercase ("fr")
  paths: string[];   // SVG "d" attributes (multiple for multi-polygon countries)
}

export interface SavedProgress {
  countries: string[]; // ISO codes found in countries mode
  capitals: string[];  // ISO codes found in capitals mode
}

// Note: QuizState is managed as runtime state in useQuizState hook,
// not as a serializable interface. See useQuizState.ts for the actual shape.
```

- [ ] **Step 2: Commit**

```bash
git add src/data/types.ts
git commit -m "feat: add shared TypeScript types and interfaces"
```

---

### Task 3: Text normalization utility

**Files:**
- Create: `src/utils/normalize.ts`

- [ ] **Step 1: Implement normalize function**

```typescript
/**
 * Normalize text for comparison:
 * 1. Lowercase
 * 2. Strip diacritics (NFD decomposition)
 * 3. Replace hyphens, apostrophes, punctuation with spaces
 * 4. Collapse multiple spaces + trim
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/[-''`.,;:!?()]/g, " ")  // punctuation to spaces
    .replace(/\s+/g, " ")             // collapse spaces
    .trim();
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/normalize.ts
git commit -m "feat: add text normalization utility"
```

---

### Task 4: Answer matching utility

**Files:**
- Create: `src/utils/matching.ts`

- [ ] **Step 1: Implement matching functions**

```typescript
import { normalize } from "./normalize";
import type { Country } from "../data/types";

/**
 * Check if user input matches a country name (mode pays).
 * Returns the ISO code of the matched country, or null.
 */
export function matchCountryName(
  input: string,
  countries: Country[],
  alreadyFound: Set<string>
): string | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  for (const country of countries) {
    if (alreadyFound.has(country.iso)) continue;
    const candidates = [country.name, ...country.variants];
    for (const candidate of candidates) {
      if (normalize(candidate) === normalized) {
        return country.iso;
      }
    }
  }
  return null;
}

/**
 * Check if user input matches the capital of a specific country.
 */
export function matchCapital(
  input: string,
  country: Country
): boolean {
  const normalized = normalize(input);
  if (!normalized) return false;
  const candidates = [country.capital, ...country.capitalVariants];
  return candidates.some((c) => normalize(c) === normalized);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/matching.ts
git commit -m "feat: add answer matching utilities"
```

---

### Task 5: Countries data file

**Files:**
- Create: `src/data/countries.ts`

This is the largest data task. Create the full 197-country dataset. Each entry needs: iso (lowercase alpha-2), name (French), variants (common alternate French names, no-accent versions, abbreviations), capital, capitalVariants, continent.

- [ ] **Step 1: Create countries.ts with all 197 entries**

The file must export `export const countries: Country[]`. Structure each entry like:

```typescript
import type { Country } from "./types";

export const countries: Country[] = [
  // === EUROPE ===
  { iso: "fr", name: "France", variants: ["Republique francaise"], capital: "Paris", capitalVariants: [], continent: "europe" },
  { iso: "de", name: "Allemagne", variants: [], capital: "Berlin", capitalVariants: [], continent: "europe" },
  { iso: "es", name: "Espagne", variants: [], capital: "Madrid", capitalVariants: [], continent: "europe" },
  // ... (all European countries)

  // === AFRIQUE ===
  { iso: "dz", name: "Algerie", variants: ["Algérie"], capital: "Alger", capitalVariants: [], continent: "afrique" },
  // ... (all African countries)

  // === ASIE ===
  { iso: "cn", name: "Chine", variants: ["Republique populaire de Chine"], capital: "Pekin", capitalVariants: ["Beijing"], continent: "asie" },
  // ... (all Asian countries)

  // === AMERIQUE ===
  { iso: "us", name: "Etats-Unis", variants: ["USA", "Etats Unis", "Etats-Unis d'Amerique"], capital: "Washington", capitalVariants: ["Washington D.C.", "Washington DC"], continent: "amerique" },
  // ... (all American countries)

  // === OCEANIE ===
  { iso: "au", name: "Australie", variants: [], capital: "Canberra", capitalVariants: [], continent: "oceanie" },
  // ... (all Oceanian countries)
];
```

**CRITICAL:** Include ALL 197 countries. The implementing agent MUST generate the complete list. Reference: 193 UN member states + Kosovo (iso: "xk"), Taiwan (iso: "tw"), Palestine (iso: "ps"), Vatican (iso: "va").

ISO codes for ambiguous cases: Ivory Coast = "ci", DR Congo = "cd", Republic of Congo = "cg", South Korea = "kr", North Korea = "kp", Myanmar = "mm", Timor-Leste = "tl", Eswatini = "sz".

Use French common names. Include no-accent variants for ALL names with accents (e.g., "Algerie" for "Algérie", "Bresil" for "Brésil"). Include common abbreviations (USA, RDC, RCA, EAU). For capitals, include French alternate names (Pekin/Beijing, Nicosie/Nicosia, Moscou/Moscow).

The implementing agent should use web search to compile and verify the complete list. Group entries by continent for readability. This will be a ~500-line file.

- [ ] **Step 2: Verify the count**

After creating the file, verify the count:

```bash
node -e "const c = require('./src/data/countries.ts'); console.log(c.countries.length)"
```

Or add a temporary log, check, then REMOVE it before committing. Expected: 197.

- [ ] **Step 3: Commit**

```bash
git add src/data/countries.ts
git commit -m "feat: add 197 countries dataset with French names and variants"
git push
```

---

### Task 6: Continents helper

**Files:**
- Create: `src/data/continents.ts`

- [ ] **Step 1: Create continents mapping**

```typescript
import type { Continent } from "./types";

export const continentLabels: Record<Continent, string> = {
  europe: "Europe",
  afrique: "Afrique",
  asie: "Asie",
  amerique: "Amerique",
  oceanie: "Oceanie",
};

export const allContinents: Continent[] = [
  "amerique",
  "europe",
  "asie",
  "afrique",
  "oceanie",
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/continents.ts
git commit -m "feat: add continents labels and list"
```

---

### Task 7: SVG pipeline — parse-svg.ts + worldPaths.ts

**Files:**
- Create: `scripts/parse-svg.ts`
- Create: `public/world.svg` (download)
- Create: `src/data/worldPaths.ts` (generated)

- [ ] **Step 1: Download the SVG world map**

Download the amCharts low-resolution world map SVG. Try this approach:

```bash
# Option A: Download from amCharts CDN
curl -o public/world.svg "https://www.amcharts.com/lib/4/geodata/svg/worldLow.svg"

# Option B: If Option A fails, search for "amcharts world svg low" and download manually
# Option C: Use Natural Earth 110m converted to SVG via mapshaper.org
```

After download, verify the file contains `<path>` elements with 2-letter `id` attributes:

```bash
grep -oP 'id="[A-Z]{2}"' public/world.svg | head -20
```

If IDs are uppercase, that's fine — `parse-svg.ts` will lowercase them. The key requirement: each country `<path>` must have an `id` attribute mapping to ISO alpha-2 codes.

- [ ] **Step 2: Create the parse-svg.ts script**

```typescript
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { countries } from "../src/data/countries";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SVG_PATH = resolve(__dirname, "../public/world.svg");
const OUTPUT_PATH = resolve(__dirname, "../src/data/worldPaths.ts");

// Simple XML-like regex extraction (no DOM parser needed for this)
const svgContent = readFileSync(SVG_PATH, "utf-8");

// Match all <path> elements with id and d attributes
const pathRegex = /<path[^>]*?\bid="([^"]+)"[^>]*?\bd="([^"]+)"[^>]*?\/?>/g;
const pathRegexAlt = /<path[^>]*?\bd="([^"]+)"[^>]*?\bid="([^"]+)"[^>]*?\/?>/g;

const pathsByCountry = new Map<string, string[]>();

// Try both attribute orders (id before d, d before id)
for (const regex of [pathRegex, pathRegexAlt]) {
  let match;
  while ((match = regex.exec(svgContent)) !== null) {
    const isIdFirst = regex === pathRegex;
    const id = (isIdFirst ? match[1] : match[2]).toLowerCase();
    const d = isIdFirst ? match[2] : match[1];

    if (!pathsByCountry.has(id)) {
      pathsByCountry.set(id, []);
    }
    pathsByCountry.get(id)!.push(d);
  }
}

// Build known ISO set from countries.ts
const knownIsos = new Set(countries.map((c) => c.iso));

// Warnings
for (const id of pathsByCountry.keys()) {
  if (!knownIsos.has(id)) {
    console.warn(`WARNING: SVG path id="${id}" has no match in countries.ts (territory or unknown)`);
  }
}
for (const iso of knownIsos) {
  if (!pathsByCountry.has(iso)) {
    console.warn(`WARNING: Country iso="${iso}" has no matching SVG path`);
  }
}

// Generate output
const entries = Array.from(pathsByCountry.entries())
  .map(([id, paths]) => {
    const pathsStr = paths.map((p) => `    ${JSON.stringify(p)}`).join(",\n");
    return `  { id: ${JSON.stringify(id)}, paths: [\n${pathsStr}\n  ] }`;
  })
  .join(",\n");

const output = `// GENERATED FILE — do not edit manually
// Run: npm run generate-map
import type { SvgPath } from "./types";

export const worldPaths: SvgPath[] = [
${entries}
];

// Extract viewBox from SVG source
export const svgViewBox = ${JSON.stringify(extractViewBox(svgContent))};
`;

function extractViewBox(svg: string): string {
  const match = svg.match(/viewBox="([^"]+)"/);
  return match ? match[1] : "0 0 2000 1001";
}

writeFileSync(OUTPUT_PATH, output, "utf-8");
console.log(`Generated ${pathsByCountry.size} country paths to ${OUTPUT_PATH}`);
```

- [ ] **Step 3: Add npm script to package.json**

Add to `scripts` in package.json:

```json
"generate-map": "npx tsx scripts/parse-svg.ts"
```

- [ ] **Step 4: Run the generator**

```bash
npm run generate-map
```

Expected: Prints country count, shows warnings for unmatched territories (Greenland, etc.), generates `src/data/worldPaths.ts`.

- [ ] **Step 5: Review warnings and verify output**

Check that the warnings are only for known non-country territories. Verify `worldPaths.ts` is not empty and has entries for major countries (fr, us, cn, br, etc.).

- [ ] **Step 6: Commit**

```bash
git add public/world.svg scripts/parse-svg.ts src/data/worldPaths.ts package.json
git commit -m "feat: add SVG world map and parse-svg pipeline"
git push
```

---

### Task 8: useLocalStorage hook

**Files:**
- Create: `src/hooks/useLocalStorage.ts`

- [ ] **Step 1: Implement the hook**

```typescript
import { useState, useCallback } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // localStorage full or unavailable — silent fail
        }
        return nextValue;
      });
    },
    [key]
  );

  return [storedValue, setValue];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useLocalStorage.ts
git commit -m "feat: add useLocalStorage hook"
```

---

### Task 9: useQuizState hook

**Files:**
- Create: `src/hooks/useQuizState.ts`

- [ ] **Step 1: Implement quiz state management**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useQuizState.ts
git commit -m "feat: add useQuizState hook with localStorage persistence"
git push
```

---

## Chunk 2: Global Styles, Routing & Home Page

### Task 10: Global styles — Dark Geopolitique theme

**Files:**
- Create: `src/styles/index.css`

- [ ] **Step 1: Create the full stylesheet**

```css
/* === Reset & Base === */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg-page: #0a1628;
  --bg-sidebar: #1e293b;
  --bg-input: #0f172a;
  --country-default: #1e3a5f;
  --country-stroke: #334155;
  --country-hover: rgba(37, 99, 235, 0.2);
  --country-selected: #2563eb;
  --country-found: #166534;
  --country-found-stroke: #22c55e;
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --text-found: #e2e8f0;
  --accent: #2563eb;
  --progress-bg: #0f172a;
}

html,
body,
#root {
  height: 100%;
  overflow: hidden;
}

body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, sans-serif;
  background-color: var(--bg-page);
  color: var(--text-primary);
}

/* === Home Page === */
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 48px;
}

.home-title {
  font-size: 3rem;
  font-weight: 700;
  text-align: center;
}

.home-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  margin-top: 8px;
  text-align: center;
}

.home-buttons {
  display: flex;
  gap: 32px;
}

.home-mode-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.home-mode-btn {
  background: var(--bg-sidebar);
  border: 2px solid var(--accent);
  border-radius: 16px;
  padding: 24px 48px;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
}

.home-mode-btn:hover {
  background: var(--accent);
  transform: translateY(-2px);
}

.home-mode-btn .btn-count {
  display: block;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--text-secondary);
  margin-top: 4px;
}

.home-mode-btn:hover .btn-count {
  color: var(--text-primary);
}

/* === Continent Filters === */
.continent-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.continent-btn {
  background: transparent;
  border: 1px solid var(--country-stroke);
  border-radius: 8px;
  padding: 6px 14px;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.continent-btn:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

/* === Quiz Page Layout === */
.quiz-page {
  display: flex;
  height: 100%;
}

.map-container {
  flex: 1;
  overflow: hidden;
  position: relative;
  cursor: grab;
}

.map-container:active {
  cursor: grabbing;
}

/* === SVG Map === */
.world-map {
  width: 100%;
  height: 100%;
}

.world-map path {
  transition: fill 0.5s, stroke 0.3s, filter 0.2s;
}

.country-path {
  fill: var(--country-default);
  stroke: var(--country-stroke);
  stroke-width: 0.5;
  cursor: pointer;
}

.country-path:hover {
  filter: drop-shadow(0 4px 8px rgba(37, 99, 235, 0.3)) brightness(1.3);
}

.country-path.found {
  fill: var(--country-found);
  stroke: var(--country-found-stroke);
  cursor: default;
}

.country-path.found:hover {
  filter: none;
}

.country-path.selected {
  stroke: var(--country-selected);
  stroke-width: 2;
}

.country-path.flash {
  stroke: var(--country-selected);
  stroke-width: 2;
}

.territory-path {
  fill: var(--country-default);
  stroke: var(--country-stroke);
  stroke-width: 0.5;
  pointer-events: none;
}

.country-label {
  fill: var(--text-found);
  text-anchor: middle;
  dominant-baseline: central;
  pointer-events: none;
  font-family: system-ui, sans-serif;
  font-weight: 600;
  opacity: 0;
  transition: opacity 0.5s;
}

.country-label.visible {
  opacity: 1;
}

/* === Sidebar === */
.sidebar {
  width: 320px;
  background: var(--bg-sidebar);
  border-left: 1px solid var(--country-stroke);
  display: flex;
  flex-direction: column;
  padding: 24px;
  gap: 24px;
  overflow-y: auto;
}

.sidebar-mode {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.sidebar-selected {
  font-size: 0.9rem;
  color: var(--accent);
  font-weight: 500;
}

.sidebar-progress {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.progress-text {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.progress-bar {
  height: 6px;
  background: var(--progress-bg);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 3px;
  transition: width 0.3s ease;
}

.sidebar-back {
  background: transparent;
  border: 1px solid var(--country-stroke);
  border-radius: 8px;
  padding: 8px 16px;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  margin-top: auto;
}

.sidebar-back:hover {
  border-color: var(--accent);
  color: var(--text-primary);
}

/* === Country Input === */
.country-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.country-input {
  background: var(--bg-input);
  border: 1px solid var(--country-stroke);
  border-radius: 8px;
  padding: 10px 14px;
  color: var(--text-primary);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.country-input:focus {
  border-color: var(--accent);
}

.country-input.shake {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(-8px);
  }
  40% {
    transform: translateX(8px);
  }
  60% {
    transform: translateX(-6px);
  }
  80% {
    transform: translateX(6px);
  }
}

/* === Completion === */
.completion-message {
  text-align: center;
  padding: 24px;
}

.completion-message h2 {
  font-size: 1.5rem;
  margin-bottom: 12px;
  color: var(--country-found-stroke);
}

.completion-message p {
  color: var(--text-secondary);
  margin-bottom: 16px;
}

/* === Tooltip for small countries === */
.country-tooltip {
  position: fixed;
  background: var(--bg-sidebar);
  border: 1px solid var(--country-stroke);
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 0.75rem;
  color: var(--text-primary);
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
}
```

- [ ] **Step 2: Import styles in main.tsx**

Add to `src/main.tsx` at the top:

```typescript
import "./styles/index.css";
```

- [ ] **Step 3: Commit**

```bash
git add src/styles/index.css src/main.tsx
git commit -m "feat: add dark geopolitique theme and global styles"
```

---

### Task 11: App.tsx — State-based routing

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Create QuizPage stub (to be replaced in Chunk 3)**

Create `src/components/QuizPage.tsx` as a placeholder so the app compiles:

```tsx
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
```

- [ ] **Step 2: Implement state-based router**

```tsx
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
```

- [ ] **Step 3: Verify app compiles**

```bash
npm run dev
```

Expected: Dev server starts, home page shows "Quiz des Pays" placeholder. Clicking Pays/Capitales should show the QuizPage stub.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/QuizPage.tsx
git commit -m "feat: add state-based routing in App.tsx with QuizPage stub"
```

---

### Task 12: HomePage component

**Files:**
- Create: `src/components/HomePage.tsx`

- [ ] **Step 1: Implement HomePage**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/HomePage.tsx
git commit -m "feat: add HomePage component with mode buttons"
```

---

### Task 13: ContinentFilter component

**Files:**
- Create: `src/components/ContinentFilter.tsx`

- [ ] **Step 1: Implement ContinentFilter**

```tsx
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
```

- [ ] **Step 2: Verify home page renders**

Start dev server, verify the home page shows title, two mode buttons with continent filters underneath.

- [ ] **Step 3: Commit**

```bash
git add src/components/ContinentFilter.tsx
git commit -m "feat: add ContinentFilter component"
git push
```

---

## Chunk 3: World Map, Sidebar & Quiz Integration

### Task 14: WorldMap component

**Files:**
- Create: `src/components/WorldMap.tsx`

This is the largest component. It renders all SVG paths, handles hover/click, zoom/pan, and displays labels for found countries.

- [ ] **Step 1: Implement WorldMap**

```tsx
import { useRef, useState, useCallback, useEffect } from "react";
import { worldPaths, svgViewBox } from "../data/worldPaths";
import { countries } from "../data/countries";
import type { QuizMode } from "../data/types";

interface WorldMapProps {
  mode: QuizMode;
  found: Set<string>;
  selectedCountry: string | null;
  onCountryClick: (iso: string) => void;
  onCountryHover?: (iso: string | null, event?: React.MouseEvent) => void;
  highlightIso: string | null; // ISO to flash briefly (countries mode)
}

// Known country ISOs for filtering territories
const countryIsos = new Set(countries.map((c) => c.iso));

// Pre-compute bounding boxes from path data
function computeBBox(pathStrings: string[]): {
  cx: number;
  cy: number;
  width: number;
  height: number;
} {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const d of pathStrings) {
    // Extract numeric coordinates from SVG path "d" attribute
    const nums = d.match(/-?\d+\.?\d*/g);
    if (!nums) continue;
    for (let i = 0; i < nums.length - 1; i += 2) {
      const x = parseFloat(nums[i]);
      const y = parseFloat(nums[i + 1]);
      if (!isNaN(x) && !isNaN(y)) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return {
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export default function WorldMap({
  mode,
  found,
  selectedCountry,
  onCountryClick,
  onCountryHover,
  highlightIso,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const [flashIso, setFlashIso] = useState<string | null>(null);
  const dragStart = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
  } | null>(null);
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Flash effect for countries mode
  useEffect(() => {
    if (highlightIso) {
      setFlashIso(highlightIso);
      const timer = setTimeout(() => setFlashIso(null), 1000);
      return () => clearTimeout(timer);
    }
  }, [highlightIso]);

  // Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform((prev) => {
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 1 + direction * 0.15;
        const newScale = Math.min(8, Math.max(1, prev.scale * factor));

        // Zoom centered on cursor
        const scaleChange = newScale / prev.scale;
        const newTx = mouseX - scaleChange * (mouseX - prev.translateX);
        const newTy = mouseY - scaleChange * (mouseY - prev.translateY);

        return { scale: newScale, translateX: newTx, translateY: newTy };
      });
    },
    []
  );

  // Pan with mouse drag — use ref to avoid stale closure
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        tx: transformRef.current.translateX,
        ty: transformRef.current.translateY,
      };
    },
    []
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform((prev) => ({
      ...prev,
      translateX: dragStart.current!.tx + dx,
      translateY: dragStart.current!.ty + dy,
    }));
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!dragStart.current) return;
      const dx = Math.abs(e.clientX - dragStart.current.x);
      const dy = Math.abs(e.clientY - dragStart.current.y);
      const wasDrag = dx > 5 || dy > 5;
      dragStart.current = null;

      // Clamp pan so at least 20% of map visible
      if (wasDrag) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          setTransform((prev) => {
            const mapW = rect.width * prev.scale;
            const mapH = rect.height * prev.scale;
            const minX = -(mapW * 0.8);
            const maxX = rect.width * 0.8;
            const minY = -(mapH * 0.8);
            const maxY = rect.height * 0.8;
            return {
              ...prev,
              translateX: Math.min(maxX, Math.max(minX, prev.translateX)),
              translateY: Math.min(maxY, Math.max(minY, prev.translateY)),
            };
          });
        }
      }
    },
    []
  );

  // Double-click to reset
  const handleDoubleClick = useCallback(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // Attach non-passive wheel handler so preventDefault() works in onWheel
  // React attaches passive wheel listeners by default; this native listener
  // marks the event as non-passive, allowing the React onWheel to preventDefault.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => e.preventDefault();
    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, []);

  // Get country name for labels
  const getCountryName = (iso: string): string => {
    const country = countries.find((c) => c.iso === iso);
    if (!country) return iso;
    if (mode === "capitals") return country.capital;
    return country.name;
  };

  return (
    <div
      ref={containerRef}
      className="map-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <svg
        className="world-map"
        viewBox={svgViewBox}
        style={{
          transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
          transformOrigin: "0 0",
        }}
      >
        {worldPaths.map((wp) => {
          const isCountry = countryIsos.has(wp.id);
          const isFound = found.has(wp.id);
          const isSelected = selectedCountry === wp.id;
          const isFlash = flashIso === wp.id;

          const className = isCountry
            ? `country-path${isFound ? " found" : ""}${isSelected ? " selected" : ""}${isFlash ? " flash" : ""}`
            : "territory-path";

          const bbox = isFound ? computeBBox(wp.paths) : null;
          const fontSize = bbox
            ? Math.min(14, Math.max(6, Math.min(bbox.width, bbox.height) * 0.3))
            : 8;
          const isSmall = bbox ? bbox.width < 20 && bbox.height < 20 : false;

          return (
            <g key={wp.id}>
              {wp.paths.map((d, i) => (
                <path
                  key={i}
                  d={d}
                  className={className}
                  onClick={
                    isCountry && !isFound
                      ? (e) => {
                          // Only handle click if not a drag
                          e.stopPropagation();
                          onCountryClick(wp.id);
                        }
                      : undefined
                  }
                  onMouseEnter={
                    isCountry
                      ? (e) => onCountryHover?.(wp.id, e)
                      : undefined
                  }
                  onMouseLeave={
                    isCountry ? () => onCountryHover?.(null) : undefined
                  }
                />
              ))}
              {isFound && !isSmall && bbox && (
                <text
                  className="country-label visible"
                  x={bbox.cx}
                  y={bbox.cy}
                  fontSize={fontSize}
                >
                  {getCountryName(wp.id)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

**Note:** The `computeBBox` function uses a simplified numeric extraction from SVG path data. It won't be perfectly accurate for complex paths with curves/arcs, but is sufficient for approximate center positioning. The implementing agent should test and adjust if labels appear off-center for specific countries.

- [ ] **Step 2: Verify map renders**

Start the dev server, click on "Pays" from the homepage. Verify:
- SVG paths render on the dark background
- Hovering countries shows a blue glow effect
- Scroll wheel zooms, drag pans
- Double-click resets zoom

- [ ] **Step 3: Commit**

```bash
git add src/components/WorldMap.tsx
git commit -m "feat: add WorldMap component with hover, click, zoom/pan"
```

---

### Task 15: CountryInput component

**Files:**
- Create: `src/components/CountryInput.tsx`

- [ ] **Step 1: Implement CountryInput with shake**

```tsx
import { useState, useRef, useEffect, useCallback } from "react";

interface CountryInputProps {
  placeholder: string;
  onSubmit: (value: string) => boolean; // returns true if correct
  autoFocus?: boolean;
}

export default function CountryInput({
  placeholder,
  onSubmit,
  autoFocus = false,
}: CountryInputProps) {
  const [value, setValue] = useState("");
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && value.trim()) {
        const isCorrect = onSubmit(value.trim());
        if (isCorrect) {
          setValue("");
        } else {
          setShaking(true);
          setTimeout(() => setShaking(false), 400);
        }
      }
    },
    [value, onSubmit]
  );

  return (
    <div className="country-input-wrapper">
      <input
        ref={inputRef}
        type="text"
        className={`country-input${shaking ? " shake" : ""}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CountryInput.tsx
git commit -m "feat: add CountryInput component with shake animation"
```

---

### Task 16: ConfettiEffect component

**Files:**
- Create: `src/components/ConfettiEffect.tsx`

- [ ] **Step 1: Implement confetti wrapper**

```tsx
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiEffectProps {
  trigger: number; // increment to fire
  prolonged?: boolean; // completion celebration
}

export default function ConfettiEffect({
  trigger,
  prolonged = false,
}: ConfettiEffectProps) {
  useEffect(() => {
    if (trigger === 0) return;

    if (prolonged) {
      // 3 successive bursts over 5 seconds
      const fire = (delay: number) => {
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 80,
            origin: { y: 0, x: 0.3 + Math.random() * 0.4 },
          });
        }, delay);
      };
      fire(0);
      fire(1500);
      fire(3000);
    } else {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0, x: 0.5 },
      });
    }
  }, [trigger, prolonged]);

  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ConfettiEffect.tsx
git commit -m "feat: add ConfettiEffect component"
```

---

### Task 17: Sidebar component

**Files:**
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Implement Sidebar**

```tsx
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
  onEscape,
  showInput,
}: SidebarProps) {
  const modeLabel = mode === "countries" ? "Pays" : "Capitales";
  const regionLabel = continent ? continentLabels[continent] : "Monde";
  const progressPercent =
    totalCount > 0 ? (foundCount / totalCount) * 100 : 0;

  return (
    <div
      className="sidebar"
      onKeyDown={(e) => {
        if (e.key === "Escape") onEscape?.();
      }}
    >
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Sidebar.tsx
git commit -m "feat: add Sidebar component with progress bar"
```

---

### Task 18: QuizPage — Full orchestration

**Files:**
- Create: `src/components/QuizPage.tsx`

- [ ] **Step 1: Implement QuizPage**

```tsx
import { useState, useCallback } from "react";
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
        // Countries mode: just flash the country (WorldMap manages the timer)
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
          // Flash and auto-center: WorldMap handles the visual flash via highlightIso
          setHighlightIso(matchedIso);
          // Note: auto-center/zoom to found country is a nice-to-have from the spec.
          // The implementing agent should add a scrollToCountry callback on WorldMap
          // that adjusts transform to center the found country's bounding box.
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
      // Show tooltip for found small countries
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
```

- [ ] **Step 2: Verify the full app works**

Start the dev server. Test:
1. Home page renders with title, buttons, continent filters
2. Click "Pays" → quiz page with map and sidebar
3. Hover countries → visual feedback
4. Type a country name → confetti, country turns green
5. Type wrong name → input shakes
6. Click "Capitales" → select country, type capital
7. Progress bar updates
8. Back button works

- [ ] **Step 3: Commit**

```bash
git add src/components/QuizPage.tsx
git commit -m "feat: add QuizPage orchestrating map, sidebar, and quiz logic"
git push
```

---

### Task 19: Final polish & integration verification

- [ ] **Step 1: Ensure all components are wired**

Verify `App.tsx` imports `HomePage` and `QuizPage`. Verify `main.tsx` imports styles. Verify the app builds without errors:

```bash
npm run build
```

Expected: No TypeScript errors, dist/ folder created.

- [ ] **Step 2: Test all interaction flows**

Using the dev server, verify each spec requirement:

| Check | Expected |
|---|---|
| Home page title | "Connaissez-vous le monde ?" |
| Pays button shows count | "197 pays" |
| Capitales button has no count | Just "Capitales" |
| 5 continent filters under each button | Amerique, Europe, Asie, Afrique, Oceanie |
| Countries mode: input always visible | Yes |
| Countries mode: type correct name | Confetti + green country + name label |
| Countries mode: type wrong name | Shake |
| Capitals mode: click country | Sidebar shows "Capitale de : [name]" |
| Capitals mode: type correct capital | Confetti + green + capital label |
| Capitals mode: Escape | Deselects country |
| Zoom (scroll wheel) | Map zooms centered on cursor |
| Pan (click-drag) | Map pans |
| Double-click | Reset zoom/pan |
| Progress bar | Updates on correct answer |
| localStorage | Refresh page — found countries persist |
| Continent filter | Only shows countries of that continent |

- [ ] **Step 3: Fix any issues found during testing**

Address any visual or functional bugs. Common issues to watch for:
- SVG path IDs not matching country data (check parse-svg warnings)
- Zoom/pan coordinate compensation
- Click vs drag disambiguation threshold
- Country labels overlapping on small countries

- [ ] **Step 4: Final commit and push**

```bash
git add -A
git commit -m "feat: complete quiz des pays v1 — countries and capitals quiz"
git push
```

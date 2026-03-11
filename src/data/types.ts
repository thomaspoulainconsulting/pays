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

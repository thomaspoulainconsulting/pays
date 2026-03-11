import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SVG_PATH = resolve(__dirname, "../public/world.svg");
const OUTPUT_PATH = resolve(__dirname, "../src/data/worldPaths.ts");

const svgContent = readFileSync(SVG_PATH, "utf-8");

const pathsByCountry = new Map<string, string[]>();

// This SVG uses cc="" attribute on both <g> and <path> elements.
// Multi-polygon countries: <g cc="xx"><path d="..."/><path d="..."/></g>
// Single-polygon countries: <path cc="xx" d="..."/>

// Strategy: Parse <g cc="xx">...</g> blocks for multi-path countries,
// and standalone <path cc="xx" d="..."/> for single-path countries.

// First, extract <g cc="xx">...</g> groups
const groupRegex = /<g\s+cc="([a-z]{2})">([\s\S]*?)<\/g>/g;
let match;
while ((match = groupRegex.exec(svgContent)) !== null) {
  const cc = match[1];
  const groupContent = match[2];
  // Extract all <path d="..."> within the group
  const pathRegex = /\bd="([^"]+)"/g;
  let pathMatch;
  const paths: string[] = [];
  while ((pathMatch = pathRegex.exec(groupContent)) !== null) {
    paths.push(pathMatch[1]);
  }
  if (paths.length > 0) {
    if (!pathsByCountry.has(cc)) {
      pathsByCountry.set(cc, []);
    }
    pathsByCountry.get(cc)!.push(...paths);
  }
}

// Then extract standalone <path cc="xx" d="..."/> (not inside a <g>)
// We match <path> with cc attribute that are NOT inside a <g cc> block.
// Simple approach: match all <path cc="xx" d="..."/> and skip those already found in groups.
const standalonePathRegex = /<path\s+cc="([a-z]{2})"\s+d="([^"]+)"[^>]*\/?>|<path\s+d="([^"]+)"\s+cc="([a-z]{2})"[^>]*\/?>/g;
while ((match = standalonePathRegex.exec(svgContent)) !== null) {
  const cc = match[1] || match[4];
  const d = match[2] || match[3];
  // Only add if not already captured from a <g> block
  // Check if this path's position is inside a group block
  // Simple heuristic: if cc already has paths from group parsing, skip standalone
  // Actually, we should always add — groups were already handled, standalone are different elements
  if (!pathsByCountry.has(cc)) {
    pathsByCountry.set(cc, []);
  }
  // Check if this exact path is already captured
  const existing = pathsByCountry.get(cc)!;
  if (!existing.includes(d)) {
    existing.push(d);
  }
}

// Load countries data to check alignment
// We can't import TS directly, so we'll just warn about the counts
const knownIsoPattern = /iso:\s*"([a-z]{2})"/g;
let countriesContent: string;
try {
  countriesContent = readFileSync(
    resolve(__dirname, "../src/data/countries.ts"),
    "utf-8"
  );
} catch {
  countriesContent = "";
  console.warn("WARNING: countries.ts not found, skipping alignment check");
}

const knownIsos = new Set<string>();
let isoMatch;
while ((isoMatch = knownIsoPattern.exec(countriesContent)) !== null) {
  knownIsos.add(isoMatch[1]);
}

// Warnings
if (knownIsos.size > 0) {
  for (const id of pathsByCountry.keys()) {
    if (!knownIsos.has(id)) {
      console.warn(
        `WARNING: SVG cc="${id}" has no match in countries.ts (territory or unknown)`
      );
    }
  }
  for (const iso of knownIsos) {
    if (!pathsByCountry.has(iso)) {
      console.warn(`WARNING: Country iso="${iso}" has no matching SVG path`);
    }
  }
}

// Extract viewBox
function extractViewBox(svg: string): string {
  const m = svg.match(/viewBox="([^"]+)"/);
  return m ? m[1] : "0 0 2000 1001";
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

export const svgViewBox = ${JSON.stringify(extractViewBox(svgContent))};
`;

writeFileSync(OUTPUT_PATH, output, "utf-8");
console.log(`Generated ${pathsByCountry.size} country paths to ${OUTPUT_PATH}`);

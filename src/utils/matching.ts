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

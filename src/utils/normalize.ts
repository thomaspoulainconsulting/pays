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

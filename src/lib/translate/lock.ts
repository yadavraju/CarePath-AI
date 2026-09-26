/**
 * Locks medication names, units, doses, dates, times and phone numbers before
 * translation, and verifies every lock survives the round trip.
 *
 * If any placeholder is missing, altered or duplicated in the translation, the
 * translation is rejected and the patient sees the approved English text —
 * a mistranslated "150 IU" is worse than no translation.
 */

export const MEDICATION_NAMES = [
  "Gonal-F",
  "Follistim",
  "Menopur",
  "Cetrotide",
  "Ganirelix",
  "Ovidrel",
  "Novarel",
  "Pregnyl",
  "Lupron",
  "Leuprolide",
  "hCG",
  "Progesterone in oil",
  "Progesterone",
  "Estradiol",
  "Doxycycline",
  "Medrol",
];

const PATTERNS: RegExp[] = [
  new RegExp(`\\b(${MEDICATION_NAMES.map((m) => m.replace(/[-]/g, "\\-")).join("|")})\\b`, "gi"),
  /\b\d+(?:\.\d+)?\s?(?:IU|iu|mg|mcg|mL|ml|units?|cc)\b/g, // doses and units
  /\b\d+(?:\.\d+)?\s?°\s?[FC]\b/g, // storage temperatures
  /\b\d+(?:\.\d+)?\s?(?:minutes?|hours?|days?|weeks?|pounds?|lbs?|kg)\b/gi, // durations and weights
  /\b\d{1,2}:\d{2}\s?(?:AM|PM|am|pm)?\b/g, // clock times
  /\b\d{1,2}\s?(?:AM|PM|am|pm)\b/g,
  /\(\d{3}\)\s?\d{3}-\d{4}|\b\d{3}-\d{3}-\d{4}\b/g, // phone numbers
  /\b(?:Day|day)\s\d{1,2}\b/g,
  /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s\d{1,2}\b/g,
];

export type Locked = { masked: string; tokens: string[] };

export function lockTokens(text: string): Locked {
  const tokens: string[] = [];
  let masked = text;
  for (const re of PATTERNS) {
    masked = masked.replace(re, (m) => {
      // Don't re-lock inside an existing placeholder.
      if (/^⟦\d+⟧$/.test(m)) return m;
      tokens.push(m);
      return `⟦${tokens.length - 1}⟧`;
    });
  }
  return { masked, tokens };
}

export function unlockTokens(translated: string, tokens: string[]): string | null {
  const found = translated.match(/⟦\d+⟧/g) ?? [];
  if (found.length !== tokens.length) return null;
  const seen = new Set(found);
  if (seen.size !== tokens.length) return null;
  for (let i = 0; i < tokens.length; i++) if (!seen.has(`⟦${i}⟧`)) return null;
  return translated.replace(/⟦(\d+)⟧/g, (_, i) => tokens[Number(i)]);
}

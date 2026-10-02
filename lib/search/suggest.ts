/**
 * Pure helpers for search-as-you-type — no server imports, so the client search box and the API route share them.
 */

export const SUGGEST_MIN_CHARS = 2;
export const SUGGEST_MAX_CHARS = 60;

export interface SuggestProduct {
  name: string;
  slug: string;
  /** what the customer pays today: the sale price when there is one, else the base price */
  price: number;
  image: string | null;
  vendor: string;
}
export interface SuggestLink {
  name: string;
  slug: string;
}
export interface SuggestResult {
  products: SuggestProduct[];
  categories: SuggestLink[];
  vendors: SuggestLink[];
}
export const EMPTY_SUGGESTIONS: SuggestResult = { products: [], categories: [], vendors: [] };

/**
 * What the user typed, cleaned up for sending — or null when it isn't worth a request (too short). Control characters
 * become spaces, runs of whitespace collapse, and it is cut to SUGGEST_MAX_CHARS. The database tokenises again on its own;
 * this only keeps junk and giant inputs off the wire.
 */
export function normaliseSuggestQuery(raw: string | null | undefined): string | null {
  const cleaned = (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, SUGGEST_MAX_CHARS).trim();
  return cleaned.length >= SUGGEST_MIN_CHARS ? cleaned : null;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Split `text` into runs, flagging the ones that match the start of a word the user typed — so "mem" bolds the
 * "Mem" in "Luxe Memory Hamper". Matching is case-insensitive and only at word starts (typing "am" must not bold the
 * middle of "Hamper"). The runs always concatenate back to exactly `text`.
 */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const tokens = [...new Set(query.toLowerCase().split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (tokens.length === 0 || !text) return [{ text, match: false }];
  const re = new RegExp(`(?<![\\p{L}\\p{N}\\p{M}])(?:${tokens.map(escapeRegExp).join("|")})`, "giu");
  const parts: { text: string; match: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ text: text.slice(last, at), match: false });
    parts.push({ text: m[0], match: true });
    last = at + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts.length ? parts : [{ text, match: false }];
}

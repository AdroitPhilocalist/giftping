import { z } from "zod";

// Single words only (no spaces) — matches the DB's search_synonyms_term_format/synonyms_format CHECK
// constraints, and expand_search_tsquery()'s OR-group syntax needs each side to be one lexeme anyway
// (see supabase/migrations/20261011220000_search_synonyms_and_fuzzy.sql for why).
const WORD_RE = /^[a-z0-9]{2,30}$/;
const wordSchema = z.string().trim().toLowerCase().regex(WORD_RE, "Letters and numbers only, 2-30 characters, no spaces.");

/** A comma-separated textbox ("mithai, candy, dessert") into a clean, deduped, capped word list — same shape as lib/validation/product.schema.ts's parseFreeTags. */
export function parseSynonymWords(raw: string | undefined): string[] {
  return Array.from(new Set((raw ?? "").split(",").map((w) => w.trim().toLowerCase()).filter(Boolean))).slice(0, 10);
}

export const searchSynonymSchema = z.object({
  term: wordSchema,
  synonyms: z.array(wordSchema).min(1, "Add at least one synonym.").max(10, "Up to 10 synonyms."),
});
export type SearchSynonymInput = z.infer<typeof searchSynonymSchema>;

# Search improvement: synonyms, typo tolerance, no-results fallback — 12 Oct

Client asked, in plain terms, whether the search box would find a product by *meaning* rather than just by
literal word match — e.g. would searching "mobile" find something named "phone"? Investigated the real
behaviour (not assumption): `search_products()`/`suggest_product_ids()` were pure Postgres full-text search
over name/tags/description, so the answer was genuinely no — a search only ever matched a literal word or its
English stem. In this catalogue the real-world version of that gap was things like "sweets" finding nothing
for a product tagged "chocolates", or "scent" finding nothing for something tagged "home fragrance". There was
also zero typo tolerance ("hampr" found nothing), and a no-results search was a dead end with no fallback.

## What was built

**1. Admin-editable synonyms** (`search_synonyms` table + `/admin/search`). A synonym group is `{term, synonyms[]}`
and the lookup is bidirectional — a row `{term: "perfume", synonyms: [cologne, fragrance, scent]}` makes
searching "cologne" also find products matching "perfume", not just the reverse — so one row covers a whole
group, no need for separate entries per pair. `expand_search_tsquery()` (new) does the lookup and both
`search_products()` and `suggest_product_ids()` were rewritten to call it instead of building a plain tsquery
themselves; their signatures are unchanged, so `lib/search/index.ts`/`suggestions.ts` needed no changes to
keep working as before — only the behaviour underneath improved.

Scope deliberately kept to single words, no phrase synonyms ("gift box" → "hamper"): to_tsquery's OR-group
syntax needs each side to be one lexeme; a phrase synonym would need the `<->` phrase operator and a different
query shape. Single words already cover the real cases that came up.

**2. Typo-tolerant fallback** (`search_products_fuzzy()`). `pg_trgm` was already enabled (Stage 1, "fuzzy/
partial text search support") but nothing had ever actually used it. `lib/search/index.ts`'s `searchProducts()`
now calls this only when the exact, synonym-expanded search comes back empty, and flags the result (`fuzzy:
true`) so `/search` can tell the visitor "No exact matches — showing close results" instead of silently
relabelling a typo as an exact hit. **Real bug caught and fixed before shipping**: the first version used plain
`similarity()`, which scored the *entire* product name against the query — a short typo like "hampr" scored
near zero against a long multi-word name ("Emerald & Copper Celebration Hamper") simply because most of the
name's trigrams have nothing to match, so it returned zero results, the opposite of the point. Switched to
`word_similarity()`, which finds the best-matching contiguous part of the name instead of scoring the whole
string — confirmed live: "hampr" now correctly surfaces every real hamper product.

**3. No-results fallback** (`getRelatedBrowseLinks()`). When a search finds nothing even with the fuzzy
fallback, `/search` now offers matching categories/boutiques instead of a dead end — the same ILIKE approach
`lib/search/suggestions.ts` already used for the live-typing dropdown, reused for the submitted-search case.

## Two real SQL bugs caught before shipping (worth remembering)

1. **Operator precedence in a hand-built tsquery.** `expand_search_tsquery()` joins each token's synonym group
   with `|` and joins the groups themselves with `&` — without parentheses around each group, `a | b & c`
   parses as `a | (b & c)` (tsquery's `&` binds tighter than `|`, same as boolean logic), not the intended
   `(a | b) & c` across tokens. Fixed by wrapping every group in parentheses before joining.
2. **`pg_trgm`'s operator class and functions don't resolve unqualified here**, unlike `pgcrypto`'s
   `gen_random_uuid()` used unqualified everywhere else in this codebase — two separate failed `db push`
   attempts (`gin_trgm_ops does not exist`, then `function similarity(text, text) does not exist`) before
   qualifying both as `extensions.gin_trgm_ops` / `extensions.word_similarity()`.

A CHECK constraint can't contain a subquery, so validating "every element of this array matches the word
format" needed a small `is_valid_word_array()` helper function instead of an inline `EXISTS (...)`. Also fixed
a real NULL-semantics trap: `array_length('{}', 1)` is `NULL`, not `0`, and a `NULL` CHECK result is treated as
a *pass* — an un-coalesced length check would have silently let an empty synonyms array through.

## Live-verified end to end, not just unit-tested

Migration pushed to the real dev database and round-tripped with a live script before any app code was
written: confirmed "sweets" found nothing before a synonym group existed, found the right chocolate/mithai
products after; confirmed "hampr" found nothing via exact search and the right hamper products via fuzzy.
Then verified through the actual UI, not just the RPC: signed in as the admin test account, created four real
synonym groups through `/admin/search` (perfume/cologne/fragrance/scent, sweets/mithai/chocolates/candy,
flowers/bouquet/roses, diary/journal/notebook) — these are genuine starter content, not test rows left behind.
Confirmed live: "cologne" went from 0 results to 7 the moment the synonym group was saved; the no-exact-match
message renders correctly for a real typo; a true nonsense query still correctly shows nothing (no false-
positive category/vendor chips); the live-typing dropdown also benefits from synonym expansion, not just the
submitted-search page (typing "bouquet" now also surfaces rose/flower-tagged products that don't literally
say "bouquet"). 540/540 tests (11 new), tsc/eslint/build clean.

## Honest scope notes

- No phrase synonyms (see above) — single words only.
- The no-results category/vendor fallback uses the existing ILIKE pattern, not a smarter relevance ranking;
  fine at this catalogue size.
- Did not build true semantic/embedding search — flagged in the original assessment as a real cost-budget item
  (compute + a vector store) not justified at this catalogue size; synonyms + fuzzy matching cover the real
  gap for close to zero added cost, reusing an extension that was already paid for and already enabled.

# Search autocomplete — fourth of the remaining spec gaps

## The real problem: the existing search can't do "as you type"

`search_products()` uses `websearch_to_tsquery('english', …)`, which matches whole, stemmed words. "ham" matches nothing;
"hamper" does. That is right for a submitted search and useless mid-keystroke. So autocomplete is not just a UI on
top of the existing RPC — it needed its own query: every typed word becomes a `word:*` prefix term, AND-ed, run against the
same GIN-indexed `search_vector` (so "luxe mem" → Luxe Memory Hamper, and it stays fast at catalogue scale).

## Decisions

- **Prefix-match in SQL, tokenise in SQL.** `suggest_product_ids(text, int)` splits on anything that isn't a letter/digit
  before building the tsquery. Handing raw user text to `to_tsquery` throws on `&`, `(`, `'`, a lone `:` — and a search
  box receives all of those. Checked against hostile input: no errors, no injection surface (the text never becomes SQL).
- **SECURITY INVOKER** (default), same as `search_products()`: RLS still decides visibility (active products, approved
  boutiques). Categories/boutiques are read with the visitor's own session for the same reason.
- **Returns ids only**; TypeScript joins display fields and restores ranking order (`.in()` doesn't preserve it).
- **Three groups, not one list.** Products (6), categories (3), boutiques (3), plus a final "See all results for…" row.
  Category and boutique matches are "name contains" (`ilike`, with `%`/`_`/`\` escaped so a typed `%` is literal) —
  small tables, and a boutique name is often remembered by its middle word.
- **Endpoint** `GET /api/search/suggest`: public (the catalogue is), per-IP `searchRateLimit` (60/min; it existed in
  `rate-limit.ts` but nothing used it), min 2 chars, 60-char cap, `private, max-age=30`. A throttled or failed lookup just
  means no suggestions.
- **Progressive enhancement is the foundation**: `SearchBar` is still a plain `<form action="/search" method="get">`. Enter
  with nothing highlighted submits normally, so JS-off or a failed fetch degrades to the old behaviour.
- **Client behaviour**: 180ms debounce, in-flight request aborted on the next keystroke (an old answer can't overwrite a
  new one — and the list only shows when the answer matches the current text), per-query cache, nothing fetched until the box
  is focused/typed in (a pre-filled `/search?q=` box doesn't hit the API on load), Esc closes but keeps the text (a
  `type="search"` input would otherwise also clear itself), ↓ reopens, ARIA combobox/listbox/option + `aria-activedescendant`
  + a polite live region, mousedown is prevented on rows so the input keeps focus until the click navigates.

## Verified

API (curl, no cookies — i.e. a guest): `ham` → 6 hampers; `luxe mem` → Luxe Memory Hamper; `lum` → 2 boutiques; `gift` →
6 products + a category + 2 boutiques; `a`, `%`, `Mom's & (x`, `'; drop` → 200, no error. Browser: dropdown overlays the
homepage hero without clipping; photos/prices/bold prefix render; ↓↓ then Enter opened the highlighted product; Esc
closed and kept text; ↓ reopened; plain Enter on "gift" → `/search?q=gift` (22 results); no-match message and live-region
text; a row's click path (mousedown prevented → focus and list kept → click navigates to `/vendors/lumen-and-ash`);
typing "gift" produced exactly one request; a pre-filled box produced zero on load.

## Not verified / limits

- **Upstash rate limiting** isn't configured locally (limiters no-op), so the 429 path is unexercised.
- **Real screen reader**: roles/attributes are standard, but not tried with VoiceOver/NVDA.
- **Mouse clicks via coordinates** in the browser test tool repeatedly landed on the card behind the list (the tool's
  coordinate mapping was already known-flaky: a coordinate click on the search input itself also failed). The element-at-point
  check showed the row topmost, and dispatching the events directly worked, so this is judged a tool artifact — but a human
  mouse click is worth one manual try (it's in the manual test guide).
- **Non-English catalogues**: the search config is `english`; stemming/prefixing of Devanagari etc. is untested. The client
  highlighter does handle combining marks.
- No "recent searches" or popular-searches-on-focus — would need storage; left out deliberately.
- Product suggestions respect the `english` stop-word list: a query of only stop words ("for the") returns nothing.

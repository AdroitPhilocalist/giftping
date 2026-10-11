# Real favicon + Organization/WebSite structured data — 11 Oct

## What prompted this

The client searched "giftping" on Google and the result looked "amateur" — the icon shown next to the domain
wasn't even GiftPing's logo. Checked `app/favicon.ico` directly: it was the stock Next.js starter icon, 25,931
bytes, dated 16 Sept — the project's very first day, never touched since, even though the real "Gp" monogram +
robin artwork (`public/images/logo-gp.webp`) has existed since 5 Oct. The site itself has always looked right;
only the icon metadata search engines and browser tabs actually read was still the placeholder.

## What changed

- **A real icon set, generated from the actual logo** (`sharp` + `png-to-ico`, both already in the toolchain):
  `app/icon.png` (512×512), `app/apple-icon.png` (180×180, flattened onto the brand's cream canvas — transparent
  PNGs render unpredictably as home-screen tiles on iOS), and a proper multi-resolution `app/favicon.ico`
  (16/32/48/256px) replacing the stock one. Next's App Router file convention picks these up automatically —
  confirmed live: the rendered `<head>` now has correct `<link rel="icon">` / `<link rel="apple-touch-icon">`
  tags pointing at the real files, all serving `200` with the right content types.
- **A web app manifest** (`app/manifest.ts`, Next's native file convention → `/manifest.webmanifest`): real name,
  short name, description, and `/icons/icon-192.png` / `/icons/icon-512.png` (also generated from the real logo),
  plus the brand's actual theme colour (`#0c2a1d`) and canvas colour (`#fbf6f1`) — so "Add to Home Screen" on a
  phone shows the real mark, not a generic page icon.
- **Organization + WebSite JSON-LD on the homepage** (`lib/seo/structured-data.ts`: `organizationJsonLd()`,
  `websiteJsonLd()`, both pure and tested): gives Google an explicit, machine-readable statement of the real
  brand name, URL, and logo — the standard lever that makes a result look more like a verified real business
  over time (Knowledge Panel eligibility, a correct brand icon in search, and the `WebSite` entry's
  `SearchAction` is also what makes Google consider showing a search box directly under the result).
  `sameAs` (social profile links) deliberately left out until the client has real live profiles — a placeholder
  link there would be worse than none.

## Verified

Local dev server: generated icon visually confirmed correct (not blurry, not corrupted) by actually decoding the
`.ico` back to PNG and viewing it; `/icon.png`, `/apple-icon.png`, `/favicon.ico`, `/manifest.webmanifest` all
return `200` with correct content types; the rendered homepage `<head>` has the right `<link>` tags; the
Organization/WebSite JSON-LD renders correctly with real production URLs (`NEXT_PUBLIC_APP_URL` is already set to
`https://www.giftping.in`). 525/525 tests (2 new), tsc/eslint/build clean.

## Not instant

Favicon updates are notoriously slow for Google to refresh in live search results — this is a known industry
lag (sometimes 1–4 weeks after a real crawl), separate from and slower than the ordinary page-content reindex
requested the previous day. The fix is correct and deployed; the public search snippet visibly updating is a
"wait and occasionally re-request indexing" situation, not something further code can speed up.

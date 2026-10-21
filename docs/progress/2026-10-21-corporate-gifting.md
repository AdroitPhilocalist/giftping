# Corporate gifting — B2B landing page and enquiry inbox

_2026-10-21_

## Why this exists

Corporate gifting was reachable only through `/categories/corporate-gifting`, a product-grid template. That is a
collection, not a B2B proposition: it could not explain minimum quantities, branding, consolidated quoting or
multi-recipient delivery, and it gave a company nowhere to send a brief. The header already had a **Corporate
Gifting** item, so the site was also teaching visitors that corporate was just another occasion.

The agreed direction was a proper services landing page at `/corporate-gifting` with a quote-first CTA, backed by
the existing corporate category as the curated collection. The category remains the canonical product collection;
the old `/shop/corporate-branded-gifts` product-type route is left alone (it is a taxonomy page, not the front door).

## What shipped

- **`/corporate-gifting`** — split hero, use cases, “the details, handled”, four-step process, curated corporate
  products, a structured enquiry form, FAQs and trust points. It uses `type-corporate-branded-gifts.webp` as the
  hero and links to `/categories/corporate-gifting` for the collection.
- **Enquiry flow** — Zod schema (`lib/validation/corporate-enquiry.schema.ts`), Server Action
  (`lib/corporate/enquiry-actions.ts`), honeypot, dedicated rate limit (`5 / 10 min`), service-role insert and an
  in-app notification to every active admin. The public form is client-validated first, then re-validated on the
  server; it never writes straight to PostgREST.
- **Admin inbox** — `/admin/corporate-enquiries` lists briefs newest-first, filters by status, shows the full
  brief, and lets an admin change status / add an internal note. Changes are recorded in `audit_logs`. A
  **Corporate** item was added to the admin navigation.
- **Data model** — `supabase/migrations/20261021100000_corporate_enquiries.sql` creates
  `public.corporate_enquiries` with CHECK constraints on every stored code, RLS (admins read/update only), no
  client INSERT/DELETE grants, an updated-at trigger, and indexes for the inbox.
- **Navigation / SEO** — header, footer, homepage quick link and mall zone now point at `/corporate-gifting`.
  Corporate is filtered out of the Occasions mega-menu and the `/categories` grid, which now carries a distinct
  corporate banner. A new `corporate-gifting` entry in `lib/seo/pages.ts` gives the page editable metadata and
  adds it to the sitemap.
- **Tests/docs** — schema tests cover valid/invalid briefs, optional fields, dates, enums and the admin update
  shape. The manual test guide now has a full **section 19** (entry points, page, collection, form validation,
  successful submission, notification, admin inbox, access control, SEO, mobile, and an optional rate-limit
  check) plus a client **demo run sheet** in 19.12.

## Verification

- `npx tsc --noEmit` — clean
- `npm run lint` — clean
- `npm test` — 592 tests passing
- `npm run build` — clean
- Rendered `/corporate-gifting` at desktop and 390px viewport; no horizontal overflow. Client validation was
  exercised against the rendered form (all required-field messages appear).

## Before this can take live enquiries

The migration is written but **not applied** in this environment: the linked Supabase CLI access token is invalid
and no database password is available locally. Apply it with:

```bash
supabase db push
```

or run the SQL in the Supabase SQL editor. After it is applied, submit a real brief end-to-end and confirm:

1. a row lands in `corporate_enquiries`;
2. every active admin gets a bell notification linking to `/admin/corporate-enquiries`;
3. the lead appears in the inbox and its status/internal note can be saved.

Until then the public page renders normally but the form's insert will report a generic “couldn’t save” error.

# Stage 4 — Vendor Portal (core) + admin approval gate

Date: 2026-09-19

## What was built

- **Vendor onboarding** (`/vendor/register`): business info, GSTIN/PAN/IFSC-validated KYC and bank details,
  warehouse address. States: sign-in prompt / under review / approved / rejected (with reviewer note) / form.
- **Admin approval gate** (`/admin/vendors`, `/admin/products`): approve/reject with a reason. Approving a vendor
  promotes `users.role` to `vendor`, writes an `audit_logs` row and a `notifications` row (both service-role only).
  Full admin suite is still Stage 11.
- **Vendor portal** (`app/vendor/(portal)/…`): dashboard, product list with status badges + reviewer note +
  Hide/Resubmit, product create/edit (RHF + Zod, variants via `useFieldArray`), image manager, orders stub.
- **Image pipeline**: `POST /api/vendor/upload-image` → sharp validation of the real bytes → WebP full/medium/thumb →
  Supabase Storage `product-images` → `product_images` rows + `products.thumbnail_url`. Client downscales only
  files >1.5MB (Vercel body cap 4.5MB; Server Actions 1MB, hence a route handler).
- **Commission resolution** (`lib/commerce/commission.ts`, unit-tested): vendor override → category → platform
  default (`platform_settings.default_commission_rate`, 10) → hard fallback 10. `!= null` semantics so 0 is a real override.
- **Bank-detail encryption** (`lib/security/encryption.ts`, unit-tested): AES-256-GCM in the app layer, key in
  `VENDOR_BANK_ENCRYPTION_KEY`. Only ciphertext + last4 are stored; admin UI shows `••••last4`.

## Security findings at the start of the stage (and fixes)

Probing the Stage 1–3 schema before building on it found real holes:

1. `anon` could read vendor PAN / GSTIN / bank / commission columns (RLS is row-level, not column-level).
   → new `vendor_private` table (owner/admin RLS), columns dropped from `vendors`.
2. Any signed-in customer could INSERT an already-approved, featured, 0%-commission vendor, and an `active` product
   with fake ratings. → `vendors_insert_own_pending` / `products_insert_own_pending` policies (pending only, derived
   fields zeroed) + widened update-guard triggers (vendor can't change status/vendor_id/counters/approved_at/etc.).
3. `vendor_private` admin-only fields (commission, razorpay ids, rejection_reason) guarded by an INVOKER trigger.

All re-verified by hand with psql role simulation.

## Lessons worth remembering

- **`INSERT … RETURNING` must also pass the SELECT policy.** The products SELECT policy used `owns_product(id)`,
  which looks the row up by id and can't see a row that's mid-insert → vendor's insert failed. Policy now compares the
  row's own column: `is_vendor_owner(vendor_id)`.
- **Column-name slip**: `vendors.total_sales` vs `products.total_sold`.
- **`useFieldArray` id collision**: the default key is `id`, clobbering the variant's DB id → `keyName: "fieldKey"`.
- Zod v4 default messages ("Too small…") are unfriendly — give custom messages.
- macOS has no `timeout`; nested heredocs in one-liners can hang — write files with the Write tool and close stdin
  (`< /dev/null`) for CLI pushes.
- Browser-tool quirk: snapshots can be stale after Server Action + `router.refresh()`; verify with JS/DB.

## Verification done (real browser + psql/curl)

- Application validation + submission; bank number stored only as a 56-char ciphertext; GSTIN/PAN uppercased.
- Customer blocked from the upload route (403) and the portal (redirect); anon can't write/list the bucket.
- Admin approve vendor → status, role promotion, audit log, notification.
- Product create → `pending`, invisible to anon (storefront, PDP 404, search 0 hits).
- Upload accepts a valid image, rejects a disguised text file and a 100px image; 3 WebP renditions stored;
  `cache-control: public, max-age=31536000`.
- Admin **reject** with reason → status `rejected`, reason saved, notification + audit; vendor sees reviewer note.
- Vendor **resubmit** → `pending`; admin **approve** → `active`, reason cleared.
- Approved product visible on PDP, vendor storefront, category page and search; image served via `next/image`.
- Editing an active product → back to `pending` ("re-reviewed before going live").
- `npm run lint`, `npx tsc --noEmit`, `npm test` (13 tests) clean.

## Deliberately deferred

Bulk CSV upload; real vendor order management (needs Stages 5–8); vendor logo/banner upload; admin notification
emails (Resend not wired); vendor-level rating rollup (needs its own trigger — see CLAUDE.md); Razorpay
contact/fund-account creation on approval (Stage 7); commission applied at order time (Stages 5–7).

## Go-live reminders added

- Set `VENDOR_BANK_ENCRYPTION_KEY` in Vercel with the *same* value used in any env holding real vendor data; back it up.
- Delete the test accounts and the test vendor/product ("Lumière Keepsakes") before launch.

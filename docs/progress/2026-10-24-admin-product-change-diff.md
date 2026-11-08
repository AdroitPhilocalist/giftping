# Admin product review: before/after diff

**Date:** 2026-10-24

## Problem

When a vendor edited a live product, the listing correctly went back to `pending`, but the admin queue only showed the current product. A reviewer could not tell what the vendor had actually changed, so approving was effectively a blind approval.

## What changed

- Vendor saves now record a versioned `ProductSnapshot` in the existing admin-only `audit_logs` table:
  - action: `product.vendor_change`
  - entity: `product`
  - `before_data`: the state before the first edit in this review cycle (or `null` for a brand-new product)
  - `after_data`: the latest submitted state
- Snapshots include the fields a vendor can change plus photos, variants and specifications:
  - name, category, product type, short/long description
  - prices, SKU, stock, weight, GST, HSN
  - search/occasion/recipient tags
  - engraving setup
  - active variants
  - attribute values (with labels)
  - photo order/main-photo flag
- The same snapshot is recorded for image uploads, image deletions, main-photo changes, and resubmissions.
- The admin products queue now shows:
  - a cumulative diff from the **last approved version** to the current pending version
  - every save in the current review cycle, so an earlier edit cannot be hidden by a later one
  - added/removed/changed variants
  - specification changes
  - added/removed photos and main-photo changes
  - a full current-listing view for new products, imports, and older pending products with no captured history
- New products are shown as `New product submission` with the full current listing; they have no previous version.

## Why `audit_logs` instead of a new table

`audit_logs` already has the right access model: admins can read it, clients cannot insert into it, and trusted server code writes with the service role. It also gives the reviewer a durable trail without another migration. Snapshot rows are versioned (`version: 1`) so a future shape change can ignore old rows safely.

## Files

- `lib/catalog/product-review.ts` — snapshot/diff types and pure review logic
- `lib/vendor/product-snapshot.ts` — reads snapshots and writes the audit trail
- `components/admin/ProductReviewDetails.tsx` — reviewer-facing diff UI
- `app/admin/products/page.tsx` — loads current snapshots + approval/change history
- `lib/vendor/actions.ts` — records changes for product saves, image changes and resubmissions
- `app/api/vendor/upload-image/route.ts` — records photo uploads
- `lib/catalog/product-review.test.ts` — diff and review-cycle tests

## Verification

- `npm test` — 612 tests pass
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Snapshot query checked against the live Supabase schema, including the nested attribute label embed.

## Reviewer flow

1. Vendor edits a live product.
2. Product moves to `pending` as before.
3. Admin opens `/admin/products`.
4. The card shows **Changes since the last approval**, with old → new values, variant/attribute changes and photo changes.
5. Admin approves or rejects with the existing buttons.
6. On approval, that approved version becomes the baseline for the next edit.

## Note for existing pending products

Products already pending before this change have no snapshot history. The queue falls back to the full current listing with a clear note. New edits from that point onward are captured normally.

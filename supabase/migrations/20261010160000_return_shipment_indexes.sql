-- ============================================================================
-- Return-shipment safety nets, found while building reverse-pickup booking (spec gap #6, docs/progress/
-- 2026-10-01-spec-gap-analysis.md). The Stage 8 shipment indexes only ever covered FORWARD shipments
-- (is_return = false), so nothing stopped two return-pickup rows being claimed for the same order+vendor
-- concurrently, and a return AWB wasn't protected by the global AWB-uniqueness index at all. Same pattern as
-- the forward-shipment guards (shipments_one_live_per_vendor_order / shipments_awb_unique), just extended to
-- is_return = true too.
-- ============================================================================

create unique index shipments_one_live_return_per_vendor_order on public.shipments (order_id, vendor_id)
  where is_return = true and status <> 'cancelled';

drop index public.shipments_awb_unique;
create unique index shipments_awb_unique on public.shipments (awb_number) where awb_number is not null;

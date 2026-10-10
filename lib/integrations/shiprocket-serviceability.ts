/**
 * Interprets Shiprocket's serviceability response. Pure, and pinned by tests to responses captured from the REAL API
 * (Sept 2026): a serviceable route returns `data.available_courier_companies[]` each with `estimated_delivery_days`,
 * `rate` and `courier_company_id`; an unserviceable route returns HTTP 200 with an empty/absent list and a
 * "No courier service available…" message — not a 404 — so "no couriers" must mean "unserviceable".
 *
 * Standard vs Express (added 10 Oct for the delivery-speed-options feature): "Standard" is the CHEAPEST available
 * courier's own ETA (not the fastest overall) — the most common real-world default for an unhurried shipment.
 * "Express" is the FASTEST available courier, offered as a genuine upgrade ONLY when it's a different, strictly
 * faster courier than Standard (so a route with only one courier, or where the cheapest IS the fastest, never
 * shows a pointless upgrade). `etdDays` keeps its original meaning (the fastest ETA across every courier) — every
 * existing caller (the product-page delivery checker) is unaffected.
 */
export interface ServiceabilityResult {
  serviceable: boolean;
  etdDays: number | null;
  courierCount: number;
  standardEtdDays: number | null;
  expressEtdDays: number | null;
  expressCourierId: number | null;
}

interface RawCourier {
  courier_company_id?: number | string;
  estimated_delivery_days?: string | number;
  rate?: string | number;
}

function num(value: string | number | undefined): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function interpretServiceability(json: unknown): ServiceabilityResult {
  const raw =
    (json as { data?: { available_courier_companies?: RawCourier[] } } | null)?.data?.available_courier_companies ?? [];

  const couriers = raw
    .map((c) => ({ id: num(c.courier_company_id), days: num(c.estimated_delivery_days), rate: num(c.rate) }))
    .filter((c): c is { id: number | null; days: number; rate: number | null } => c.days !== null && c.days > 0);

  if (raw.length === 0) return { serviceable: false, etdDays: null, courierCount: 0, standardEtdDays: null, expressEtdDays: null, expressCourierId: null };
  if (couriers.length === 0) return { serviceable: true, etdDays: null, courierCount: raw.length, standardEtdDays: null, expressEtdDays: null, expressCourierId: null };

  const etdDays = Math.min(...couriers.map((c) => c.days));

  // Without any rate at all there's no honest cost signal to split "cheap-and-slower" from "pricier-and-faster" —
  // behave like the original single-tier result rather than guessing an Express upgrade off an arbitrary pick.
  const withRate = couriers.filter((c) => c.rate !== null);
  if (withRate.length === 0) {
    return { serviceable: true, etdDays, courierCount: raw.length, standardEtdDays: etdDays, expressEtdDays: null, expressCourierId: null };
  }

  const cheapest = withRate.reduce((a, b) => (b.rate! < a.rate! ? b : a));
  const fastest = couriers.reduce((a, b) => (b.days < a.days ? b : a));
  const hasRealUpgrade = fastest.days < cheapest.days && fastest.id !== cheapest.id;

  return {
    serviceable: true,
    etdDays,
    courierCount: raw.length,
    standardEtdDays: cheapest.days,
    expressEtdDays: hasRealUpgrade ? fastest.days : null,
    expressCourierId: hasRealUpgrade ? fastest.id : null,
  };
}

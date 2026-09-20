/**
 * Interprets Shiprocket's serviceability response. Pure, and pinned by tests to responses captured from the REAL API
 * (Sept 2026): a serviceable route returns `data.available_courier_companies[]` each with `estimated_delivery_days`;
 * an unserviceable route returns HTTP 200 with an empty/absent list and a "No courier service available…" message —
 * not a 404 — so "no couriers" must mean "unserviceable".
 */
export interface ServiceabilityResult {
  serviceable: boolean;
  etdDays: number | null;
  courierCount: number;
}

export function interpretServiceability(json: unknown): ServiceabilityResult {
  const couriers =
    (json as { data?: { available_courier_companies?: { estimated_delivery_days?: string | number }[] } } | null)?.data
      ?.available_courier_companies ?? [];
  const days = couriers.map((c) => Number(c.estimated_delivery_days)).filter((n) => Number.isFinite(n) && n > 0);
  return { serviceable: couriers.length > 0, etdDays: days.length ? Math.min(...days) : null, courierCount: couriers.length };
}

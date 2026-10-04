/**
 * Pure rules for the diary's countdown ribbon (components/diary/DateRibbon.tsx) — "12 days to Mom's birthday" drawn as a gift ribbon that pulls tighter
 * (fills further) the closer the date gets, exactly like the shop's own free-delivery ribbon (components/shop/DeliveryRibbon.tsx) fills toward its
 * threshold. No I/O, unit-tested; the component only draws what this computes.
 */
export type CountdownPhase = "far" | "soon" | "today";

/** Matches the highlighter threshold DateCards already uses for "close" (<=14 days) — one definition of "soon", not two that could drift apart. */
const SOON_WITHIN_DAYS = 14;

export function countdownPhase(daysAway: number): CountdownPhase {
  if (daysAway <= 0) return "today";
  return daysAway <= SOON_WITHIN_DAYS ? "soon" : "far";
}

/**
 * How full the ribbon is, 0–100: fully slack at `horizonDays` or further out, fully cinched (100) today. `horizonDays` defaults to 60 — the diary's own
 * "next 60 days" window (the empty-state copy already promises "nothing in the next 60 days"), so the ribbon reaches its tightest, most attention-grabbing
 * state over exactly the stretch the diary already considers "upcoming".
 */
export function ribbonPercent(daysAway: number, horizonDays = 60): number {
  if (horizonDays <= 0) return daysAway <= 0 ? 100 : 0;
  const clamped = Math.min(Math.max(daysAway, 0), horizonDays);
  return Math.round((1 - clamped / horizonDays) * 100);
}

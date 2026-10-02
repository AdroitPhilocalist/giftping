/**
 * How much marketing email may go out right now. Pure and tested.
 *
 * The email provider meters the whole account (the free Resend tier is, as documented at the time of writing, about 100 emails a
 * day and 3,000 a month — and order confirmations and diary reminders spend from the same pool). So campaigns send inside two
 * admin-set budgets, a daily one and a monthly one, counted in UTC to match the provider. Moving to a paid plan means raising
 * these numbers in /admin/campaigns — no code change.
 */
export interface Budget {
  dailyCap: number;
  monthlyCap: number;
  sentToday: number;
  sentThisMonth: number;
}

/** How many more marketing emails may be sent right now (never negative; 0 stops sending). */
export function sendAllowance(b: Budget): number {
  const clean = (n: number) => (Number.isFinite(n) && n > 0 ? Math.floor(n) : 0);
  return Math.max(0, Math.min(clean(b.dailyCap) - clean(b.sentToday), clean(b.monthlyCap) - clean(b.sentThisMonth)));
}

export const utcDayStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
export const utcMonthStart = (now: Date) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

/**
 * A plain-language "how long will this take" for the admin, so the free tier's slowness is visible before sending rather than a
 * surprise afterwards. `monthlyLimited` means the rest won't fit in this month's budget at all.
 */
export function estimateFinish(remaining: number, b: Budget): { days: number | null; monthlyLimited: boolean } {
  if (remaining <= 0) return { days: 0, monthlyLimited: false };
  if (!(b.dailyCap > 0) || !(b.monthlyCap > 0)) return { days: null, monthlyLimited: false };
  const monthlyLeft = Math.max(0, b.monthlyCap - b.sentThisMonth);
  const todayLeft = Math.max(0, Math.min(b.dailyCap - b.sentToday, monthlyLeft));
  if (remaining <= todayLeft) return { days: 1, monthlyLimited: false };
  const monthlyLimited = remaining > monthlyLeft;
  return { days: 1 + Math.ceil((remaining - todayLeft) / b.dailyCap), monthlyLimited };
}

export function chunk<T>(list: readonly T[], size: number): T[][] {
  const n = Math.max(1, Math.floor(size));
  return Array.from({ length: Math.ceil(list.length / n) }, (_, i) => list.slice(i * n, i * n + n));
}

/** Resend's batch endpoint takes up to 100 emails per call; 2 requests per second is the account-wide API rate. */
export const BATCH_SIZE = 100;
export const BATCH_PAUSE_MS = 600;

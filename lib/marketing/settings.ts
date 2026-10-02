import "server-only";
import { createAdminClient } from "@/lib/db/admin";

/** Defaults sit well inside the free Resend tier (roughly 100/day, 3,000/month, shared with order and diary emails). */
export const DEFAULT_DAILY_CAP = 50;
export const DEFAULT_MONTHLY_CAP = 1500;

const whole = (v: unknown, fallback: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

/** platform_settings is admin-only under RLS, so it's read with the service role (same as lib/commerce/settings.ts). */
export async function getMarketingLimits(): Promise<{ dailyCap: number; monthlyCap: number }> {
  const { data } = await createAdminClient().from("platform_settings").select("key, value").in("key", ["marketing_daily_cap", "marketing_monthly_cap"]);
  const byKey = new Map((data ?? []).map((r) => [r.key, r.value]));
  return { dailyCap: whole(byKey.get("marketing_daily_cap"), DEFAULT_DAILY_CAP), monthlyCap: whole(byKey.get("marketing_monthly_cap"), DEFAULT_MONTHLY_CAP) };
}

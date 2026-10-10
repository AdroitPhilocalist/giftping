import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/db/admin";
import type { QuoteSettings } from "@/lib/commerce/totals";

const DEFAULTS = { delivery_charge: 79, free_delivery_threshold: 999, gift_wrap_charge: 49, default_commission_rate: 10, express_delivery_surcharge: 99 };

function num(value: unknown, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** platform_settings is admin-only under RLS, so it's read with the service role; falls back to safe defaults. */
export const getCommerceSettings = cache(async function getCommerceSettings(): Promise<
  QuoteSettings & { platformCommissionRate: number }
> {
  const { data } = await createAdminClient().from("platform_settings").select("key, value");
  const byKey = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    deliveryCharge: num(byKey.get("delivery_charge"), DEFAULTS.delivery_charge),
    freeDeliveryThreshold: num(byKey.get("free_delivery_threshold"), DEFAULTS.free_delivery_threshold),
    giftWrapCharge: num(byKey.get("gift_wrap_charge"), DEFAULTS.gift_wrap_charge),
    expressSurcharge: num(byKey.get("express_delivery_surcharge"), DEFAULTS.express_delivery_surcharge),
    platformCommissionRate: num(byKey.get("default_commission_rate"), DEFAULTS.default_commission_rate),
  };
});

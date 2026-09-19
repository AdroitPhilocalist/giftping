export const FALLBACK_PLATFORM_COMMISSION_RATE = 10;

export interface CommissionInputs {
  /** vendor_private.commission_rate — null/undefined means "no vendor-specific override". */
  vendorRate?: number | null;
  /** categories.commission_rate — null/undefined means "no category default". */
  categoryRate?: number | null;
  /** platform_settings.default_commission_rate. */
  platformRate?: number | null;
}

/**
 * vendor override -> category default -> platform default -> hard fallback.
 *
 * Uses `== null` semantics deliberately, not truthiness: a vendor override of 0 (the in-house
 * "GiftPing Originals" vendor, or a promotional zero-commission deal) is a real, intentional value
 * and must win over a non-zero category/platform rate, not be mistaken for "unset".
 */
export function resolveCommissionRate({ vendorRate, categoryRate, platformRate }: CommissionInputs): number {
  if (vendorRate != null) return vendorRate;
  if (categoryRate != null) return categoryRate;
  if (platformRate != null) return platformRate;
  return FALLBACK_PLATFORM_COMMISSION_RATE;
}

export function computeCommission(lineTotal: number, ratePercent: number) {
  const commission = Math.round(lineTotal * ratePercent) / 100;
  return { commission, vendorPayout: Math.round((lineTotal - commission) * 100) / 100 };
}

import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { fetchServiceability, isShiprocketConfigured } from "@/lib/integrations/shiprocket";

/**
 * Can each vendor's part of an order reach a pincode? Decided per vendor because each ships separately from its own
 * warehouse. This GATES checkout and supplies an ETA; it does not price delivery — the charge stays the predictable
 * flat-per-shipment-with-free-threshold structure from Stage 6 (live per-courier rates would make the total wobble
 * and add an API call to every checkout render; revisit if shipping cost ever outruns the delivery charge).
 *
 * Fail-open by design: if Shiprocket isn't configured, the vendor has no warehouse pincode on file, or the courier API
 * is down, the answer is "unknown" and the order is allowed (an unserviceable one is caught at dispatch instead).
 * Only a definite "no courier serves this route" blocks a purchase.
 */
export type DeliveryStatus = "ok" | "unserviceable" | "unknown";

export interface VendorDelivery {
  vendorId: string;
  vendorName: string;
  status: DeliveryStatus;
  etdDays: number | null;
}

const DEFAULT_ITEM_WEIGHT_GRAMS = 500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface DeliveryLine {
  vendorId: string;
  vendorName: string;
  quantity: number;
  weightGrams: number | null;
}

export async function checkDelivery(lines: DeliveryLine[], deliveryPincode: string): Promise<VendorDelivery[]> {
  const byVendor = new Map<string, { name: string; grams: number }>();
  for (const line of lines) {
    const entry = byVendor.get(line.vendorId) ?? { name: line.vendorName, grams: 0 };
    entry.grams += (line.weightGrams ?? DEFAULT_ITEM_WEIGHT_GRAMS) * line.quantity;
    byVendor.set(line.vendorId, entry);
  }

  const unknown = (vendorId: string, name: string): VendorDelivery => ({ vendorId, vendorName: name, status: "unknown", etdDays: null });
  if (!isShiprocketConfigured() || !/^[1-9]\d{5}$/.test(deliveryPincode)) {
    return Array.from(byVendor, ([id, v]) => unknown(id, v.name));
  }

  const admin = createAdminClient();
  const vendorIds = Array.from(byVendor.keys());
  const { data: privateRows } = await admin.from("vendor_private").select("vendor_id, warehouse_address").in("vendor_id", vendorIds);
  const pickupByVendor = new Map(
    (privateRows ?? []).map((r) => [r.vendor_id, (r.warehouse_address as { pincode?: string } | null)?.pincode ?? null]),
  );

  return Promise.all(
    Array.from(byVendor, async ([vendorId, v]): Promise<VendorDelivery> => {
      const pickup = pickupByVendor.get(vendorId);
      if (!pickup || !/^[1-9]\d{5}$/.test(pickup)) return unknown(vendorId, v.name);

      const { data: cached } = await admin
        .from("serviceability_cache")
        .select("serviceable, etd_days, checked_at")
        .eq("pickup_pincode", pickup)
        .eq("delivery_pincode", deliveryPincode)
        .maybeSingle();
      if (cached && Date.now() - new Date(cached.checked_at).getTime() < CACHE_TTL_MS) {
        return { vendorId, vendorName: v.name, status: cached.serviceable ? "ok" : "unserviceable", etdDays: cached.etd_days };
      }

      try {
        const result = await fetchServiceability({ pickupPincode: pickup, deliveryPincode, weightKg: v.grams / 1000 });
        await admin.from("serviceability_cache").upsert({
          pickup_pincode: pickup,
          delivery_pincode: deliveryPincode,
          serviceable: result.serviceable,
          etd_days: result.etdDays,
          courier_count: result.courierCount,
          checked_at: new Date().toISOString(),
        });
        return { vendorId, vendorName: v.name, status: result.serviceable ? "ok" : "unserviceable", etdDays: result.etdDays };
      } catch (error) {
        console.error("Serviceability check failed; allowing checkout", error);
        return unknown(vendorId, v.name);
      }
    }),
  );
}

export function unserviceableMessage(results: VendorDelivery[], pincode: string): string | null {
  const bad = results.filter((r) => r.status === "unserviceable");
  if (bad.length === 0) return null;
  const names = bad.map((b) => b.vendorName).join(", ");
  return `${names} can't deliver to ${pincode} yet. Choose another address or remove those items.`;
}

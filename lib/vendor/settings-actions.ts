"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { getMyVendor } from "@/lib/db/vendor-portal";

const schema = z.object({
  shortDescription: z.string().trim().max(120, "Keep the tagline under 120 characters").nullish().transform((v) => v || null),
  description: z.string().trim().min(20, "Tell shoppers a little about your brand (20+ characters)").max(1500),
  supportEmail: z.email("Enter a valid email address"),
  supportPhone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  warehouseLine1: z.string().trim().min(3, "Enter the pickup address").max(200),
  warehouseCity: z.string().trim().min(2, "Enter the city").max(80),
  warehouseState: z.string().trim().min(2, "Enter the state").max(80),
  warehousePincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a 6-digit pincode"),
});
export type VendorSettingsInput = z.input<typeof schema>;

/**
 * A vendor edits their OWN profile. Runs as the vendor (RLS + the vendors/vendor_private guard triggers stop them touching status, ratings,
 * commission, payout ids or the courier pickup name). One thing needs the service role: when the warehouse address changes, the old courier pickup
 * registration is now wrong, so it's cleared and a fresh one is registered at the next booking.
 */
export async function updateVendorSettingsAction(raw: VendorSettingsInput): Promise<{ ok: boolean; error?: string; note?: string }> {
  const user = await getServerUser();
  if (!user || (user.role !== "vendor" && user.role !== "admin")) return { ok: false, error: "Vendor access required." };
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { ok: false, error: "Please wait a moment and try again." };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };
  const v = parsed.data;

  const vendor = await getMyVendor(user.id);
  if (!vendor || vendor.status !== "approved") return { ok: false, error: "Your boutique isn't active." };
  const details = Array.isArray(vendor.details) ? vendor.details[0] : vendor.details;
  const old = (details?.warehouse_address ?? {}) as { line1?: string; city?: string; state?: string; pincode?: string };

  const supabase = await createClient();
  const a = await supabase.from("vendors").update({ short_description: v.shortDescription, description: v.description, support_email: v.supportEmail, support_phone: v.supportPhone }).eq("id", vendor.id);
  const warehouse = { line1: v.warehouseLine1, city: v.warehouseCity, state: v.warehouseState, pincode: v.warehousePincode };
  const b = await supabase.from("vendor_private").update({ warehouse_address: warehouse }).eq("vendor_id", vendor.id);
  if (a.error || b.error) return { ok: false, error: "Couldn't save your changes. Please try again." };

  const moved = old.line1 !== warehouse.line1 || old.city !== warehouse.city || old.state !== warehouse.state || old.pincode !== warehouse.pincode;
  if (moved) await createAdminClient().from("vendor_private").update({ shiprocket_pickup_location: null }).eq("vendor_id", vendor.id);

  revalidatePath("/vendor/settings");
  revalidatePath(`/vendors/${vendor.slug}`);
  return { ok: true, note: moved ? "Saved. Your new pickup address will be registered with the courier at your next booking." : undefined };
}

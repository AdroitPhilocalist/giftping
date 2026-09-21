"use server";

import { z } from "zod";
import { deliveryRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { createAdminClient } from "@/lib/db/admin";
import { checkDelivery, type DeliveryStatus } from "@/lib/commerce/delivery";

const schema = z.object({ productId: z.string().uuid(), pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode") });

export type ProductDeliveryResult = { ok: true; status: DeliveryStatus; etdDays: number | null } | { ok: false; error: string };

/**
 * "Can this gift reach my pincode, and by when?" — public (no sign-in needed), rate-limited, and it reveals nothing beyond serviceability + a day count: the boutique's
 * warehouse pincode is looked up server-side and never returned. Only ACTIVE products of APPROVED boutiques can be checked.
 */
export async function checkProductDeliveryAction(raw: { productId: string; pincode: string }): Promise<ProductDeliveryResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the pincode." };
  if (!(await checkRateLimit(deliveryRateLimit, await getRequestIp())).success) return { ok: false, error: "Please wait a moment and try again." };

  const { data: product } = await createAdminClient()
    .from("products")
    .select("vendor_id, weight_grams, status, vendor:vendors ( business_name, status )")
    .eq("id", parsed.data.productId)
    .maybeSingle();
  const vendor = Array.isArray(product?.vendor) ? product?.vendor[0] : product?.vendor;
  if (!product || product.status !== "active" || vendor?.status !== "approved") return { ok: false, error: "This gift isn't available right now." };

  const [result] = await checkDelivery([{ vendorId: product.vendor_id, vendorName: vendor.business_name, quantity: 1, weightGrams: product.weight_grams }], parsed.data.pincode);
  return { ok: true, status: result?.status ?? "unknown", etdDays: result?.etdDays ?? null };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { acceptOrder, bookShipment, type DispatchResult } from "@/lib/vendor/dispatch";

const orderIdSchema = z.string().uuid();
const packageSchema = z.object({
  orderId: z.string().uuid(),
  weightGrams: z.coerce.number().int("Whole grams only").min(50, "Weight must be at least 50 g").max(50_000, "Weight is too high"),
  lengthCm: z.coerce.number().min(1, "Length must be at least 1 cm").max(200),
  breadthCm: z.coerce.number().min(1, "Breadth must be at least 1 cm").max(200),
  heightCm: z.coerce.number().min(1, "Height must be at least 1 cm").max(200),
});
export type PackageFormInput = z.input<typeof packageSchema>;

/** The signed-in user must own an APPROVED vendor profile; everything else in this file is scoped to that vendor id. */
async function approvedVendor() {
  const user = await getServerUser();
  if (!user || (user.role !== "vendor" && user.role !== "admin")) return null;
  const vendor = await getMyVendor(user.id);
  return vendor && vendor.status === "approved" ? vendor : null;
}

async function throttled() {
  return !(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success;
}

export async function acceptOrderAction(orderId: string): Promise<{ error?: string }> {
  const vendor = await approvedVendor();
  if (!vendor) return { error: "Vendor access required." };
  if (await throttled()) return { error: "You're doing that a little fast — please wait a moment." };
  if (!orderIdSchema.safeParse(orderId).success) return { error: "Invalid order." };

  const result = await acceptOrder(vendor.id, orderId);
  if (!result.error) revalidatePath("/vendor/orders");
  return result;
}

export async function bookShipmentAction(raw: PackageFormInput): Promise<DispatchResult> {
  const vendor = await approvedVendor();
  if (!vendor) return { error: "Vendor access required." };
  if (await throttled()) return { error: "You're doing that a little fast — please wait a moment." };

  const parsed = packageSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the package details." };

  const result = await bookShipment({
    vendorId: vendor.id,
    orderId: parsed.data.orderId,
    pkg: {
      weightGrams: parsed.data.weightGrams,
      lengthCm: parsed.data.lengthCm,
      breadthCm: parsed.data.breadthCm,
      heightCm: parsed.data.heightCm,
    },
  });
  revalidatePath("/vendor/orders");
  return result;
}

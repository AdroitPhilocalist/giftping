"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { decideReturn, issueRefund, retryRefund, type RefundOutcome } from "@/lib/admin/refunds";
import { bookReturnPickup } from "@/lib/admin/return-dispatch";

/** Every action here is admin-only, judged by the role in the DATABASE (getServerUser re-reads it) — never a cookie or client claim. */
async function gate(): Promise<{ adminId: string } | { error: string }> {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { error: "Admin access required." };
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { error: "Please wait a moment and try again." };
  return { adminId: user.id };
}
const done = (result: RefundOutcome) => {
  revalidatePath("/admin/orders/[id]", "page");
  revalidatePath("/admin/returns");
  return result.ok ? { ok: true as const, message: result.message } : { ok: false as const, error: result.error, retryable: result.retryable };
};

const decideSchema = z.object({ returnId: z.string().uuid(), approve: z.boolean(), note: z.string().trim().max(300) });
export async function decideReturnAction(raw: z.input<typeof decideSchema>) {
  const g = await gate();
  if ("error" in g) return { ok: false as const, error: g.error };
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Check the details." };
  return done(await decideReturn({ ...parsed.data, adminId: g.adminId }));
}

const refundSchema = z.object({
  orderItemId: z.string().uuid(),
  amount: z.coerce.number().positive("Enter an amount above zero").max(10_000_000).refine((n) => Math.round(n * 100) === n * 100 || Math.abs(Math.round(n * 100) - n * 100) < 1e-6, "Use at most 2 decimals"),
  reason: z.string().trim().min(3, "Give a short reason").max(200),
  returnRequestId: z.string().uuid().nullable(),
  returnedQty: z.coerce.number().int().min(0).max(999),
  restock: z.boolean(),
});
export async function issueRefundAction(raw: z.input<typeof refundSchema>) {
  const g = await gate();
  if ("error" in g) return { ok: false as const, error: g.error };
  const parsed = refundSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the details." };
  return done(await issueRefund({ ...parsed.data, adminId: g.adminId }));
}

export async function retryRefundAction(refundId: string) {
  const g = await gate();
  if ("error" in g) return { ok: false as const, error: g.error };
  if (!z.string().uuid().safeParse(refundId).success) return { ok: false as const, error: "Invalid refund." };
  return done(await retryRefund({ refundId, adminId: g.adminId }));
}

export async function bookReturnPickupAction(returnRequestId: string) {
  const g = await gate();
  if ("error" in g) return { ok: false as const, error: g.error };
  if (!z.string().uuid().safeParse(returnRequestId).success) return { ok: false as const, error: "Invalid return request." };
  const result = await bookReturnPickup({ returnRequestId, adminId: g.adminId });
  revalidatePath("/admin/returns");
  if (result.error) return { ok: false as const, error: result.error };
  return { ok: true as const, message: result.warning ? `Pickup booked (AWB ${result.awb}). ${result.warning}` : `Pickup booked — AWB ${result.awb}.` };
}

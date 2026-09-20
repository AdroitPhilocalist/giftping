"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { cancelAndRefundOrder } from "@/lib/admin/orders";

const schema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(5, "Give a short reason (at least 5 characters) — the customer is told.").max(200),
});

/** Admin only — checked against the role in the DATABASE (getServerUser re-reads it), not a cookie or a client claim. */
export async function cancelOrderAction(raw: z.input<typeof schema>): Promise<{ ok: boolean; message?: string; error?: string; retryable?: boolean }> {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return { ok: false, error: "Admin access required." };
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { ok: false, error: "Please wait a moment and try again." };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };

  const result = await cancelAndRefundOrder({ orderId: parsed.data.orderId, adminId: user.id, reason: parsed.data.reason });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return result.ok ? { ok: true, message: result.message } : { ok: false, error: result.error, retryable: result.retryable };
}

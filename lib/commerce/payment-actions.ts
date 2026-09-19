"use server";

import { z } from "zod";
import { checkRateLimit, paymentRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { startPayment, verifyClientPayment } from "@/lib/commerce/payments";
import { revalidatePath } from "next/cache";

const TOO_MANY = "You're doing that a little fast — please wait a moment.";
const idSchema = z.string().uuid();

export type StartPaymentActionResult =
  | { ok: true; keyId: string; razorpayOrderId: string; amountPaise: number; orderNumber: string; name: string; email: string }
  | { ok: false; error: string };

export async function startPaymentAction(orderId: string): Promise<StartPaymentActionResult> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!(await checkRateLimit(paymentRateLimit, await getRequestIp())).success) return { ok: false, error: TOO_MANY };
  if (!idSchema.safeParse(orderId).success) return { ok: false, error: "Invalid order." };

  const result = await startPayment(user.id, orderId);
  if (!result.ok) return result;
  return { ...result, name: user.fullName, email: user.email };
}

const confirmSchema = z.object({
  orderId: z.string().uuid(),
  razorpayOrderId: z.string().min(5).max(64),
  paymentId: z.string().min(5).max(64),
  signature: z.string().min(10).max(200),
});

export async function confirmPaymentAction(raw: z.input<typeof confirmSchema>) {
  const user = await getServerUser();
  if (!user) return { ok: false as const, error: "Please sign in." };
  if (!(await checkRateLimit(paymentRateLimit, await getRequestIp())).success) return { ok: false as const, error: TOO_MANY };

  const parsed = confirmSchema.safeParse(raw);
  if (!parsed.success) return { ok: false as const, error: "Invalid payment details." };

  try {
    const result = await verifyClientPayment({ userId: user.id, ...parsed.data });
    if (result.ok) revalidatePath("/", "layout");
    return result;
  } catch (error) {
    console.error("Payment verification failed", error);
    // The webhook will still complete the order if the money really moved.
    return { ok: true as const, status: "pending" as const };
  }
}

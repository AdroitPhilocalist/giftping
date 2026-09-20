"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, dispatchRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { RETURN_REASON_KEYS } from "@/lib/commerce/refunds";
import { cancelReturnRequest, submitReturnRequest } from "@/lib/commerce/returns";

const requestSchema = z.object({
  orderItemId: z.string().uuid(),
  quantity: z.coerce.number().int("Whole units only").min(1, "Choose at least 1").max(99),
  reason: z.enum(RETURN_REASON_KEYS, { message: "Choose a reason" }),
  details: z.string().trim().max(500, "Please keep it under 500 characters").default(""),
});

/** The customer is always the signed-in user; the database re-checks that the item is theirs, delivered, inside the window and not already open. */
export async function requestReturnAction(raw: z.input<typeof requestSchema>): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!(await checkRateLimit(dispatchRateLimit, await getRequestIp())).success) return { ok: false, error: "Please wait a moment and try again." };
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the details." };

  const result = await submitReturnRequest({ customerId: user.id, ...parsed.data });
  if (result.ok) revalidatePath("/orders/[id]", "page");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function cancelReturnAction(returnId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getServerUser();
  if (!user) return { ok: false, error: "Please sign in." };
  if (!z.string().uuid().safeParse(returnId).success) return { ok: false, error: "Invalid request." };
  const result = await cancelReturnRequest({ customerId: user.id, returnId });
  if (result.ok) revalidatePath("/orders/[id]", "page");
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

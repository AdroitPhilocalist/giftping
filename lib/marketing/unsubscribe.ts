import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { unsubscribeSecret } from "./sender";
import { verifyUnsubscribeToken } from "./unsubscribe-token";

export type UnsubscribeResult = { ok: true } | { ok: false; reason: "invalid" | "unavailable" | "failed" };

/** Who a token belongs to, without changing anything (used to decide whether to show the confirm page). */
export function tokenOwner(token: string | null | undefined): { userId: string } | { error: "invalid" | "unavailable" } {
  const secret = unsubscribeSecret();
  if (!secret) return { error: "unavailable" };
  const userId = verifyUnsubscribeToken(token, secret);
  return userId ? { userId } : { error: "invalid" };
}

/**
 * Withdraw marketing consent for the person a valid token names. Idempotent: unsubscribing someone who is already unsubscribed is
 * still a success (and logs nothing new) — a second click, or a mail app that retries, must never show an error for a right this basic.
 */
export async function unsubscribeByToken(token: string | null | undefined, source: "unsubscribe_link" | "one_click"): Promise<UnsubscribeResult> {
  const owner = tokenOwner(token);
  if ("error" in owner) return { ok: false, reason: owner.error };
  const { error } = await createAdminClient().rpc("set_marketing_consent", { p_user_id: owner.userId, p_opt_in: false, p_source: source });
  return error ? { ok: false, reason: "failed" } : { ok: true };
}

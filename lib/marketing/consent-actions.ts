"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { MARKETING_NOTICE_VERSION } from "./consent";

/**
 * The account-settings switch. The person is identified from their SESSION (never from anything the client sends), and the change goes
 * through set_marketing_consent() so it is logged with its source and the wording they were shown. Turning it ON is a deliberate click
 * on an off-by-default switch; turning it OFF is the same single click — withdrawing is exactly as easy as giving.
 */
export async function setMarketingConsentAction(optIn: boolean): Promise<{ error?: string; subscribed?: boolean }> {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." };
  if (typeof optIn !== "boolean") return { error: "Invalid choice." };
  const { error } = await createAdminClient().rpc("set_marketing_consent", {
    p_user_id: user.id,
    p_opt_in: optIn,
    p_source: "settings",
    p_notice_version: optIn ? MARKETING_NOTICE_VERSION : undefined,
  });
  if (error) return { error: "Couldn't save that. Please try again." };
  revalidatePath("/account/notifications");
  return { subscribed: optIn };
}

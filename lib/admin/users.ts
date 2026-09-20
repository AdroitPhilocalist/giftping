import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/integrations/resend";
import { appBaseUrl } from "@/lib/notifications/notify";
import { buildAccountDeletedEmail } from "@/lib/notifications/templates";

/**
 * Account erasure (DPDP) and suspension. Erasure order: notify by email FIRST (the address is about to be scrubbed) -> anonymise the data in
 * one transaction (`anonymize_user`, which refuses admins, vendor owners and customers with orders in progress and changes nothing when it
 * refuses) -> soft-delete the login so they can't sign in but foreign keys still hold. Every step is safe to repeat.
 */
export type EraseOutcome = { ok: true } | { ok: false; error: string };

const REFUSALS: Record<string, string> = {
  open_orders: "There's an order still in progress. Erasure can happen once it's delivered or cancelled — a vendor needs the address to deliver it.",
  vendor_account: "This account owns a vendor profile. Close the vendor account first.",
  admin_protected: "Admin accounts can't be erased this way.",
  not_found: "Account not found.",
};

export async function eraseUser(args: { userId: string; actorId: string; byAdmin: boolean }): Promise<EraseOutcome> {
  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("email, full_name, anonymized_at").eq("id", args.userId).maybeSingle();
  if (!user) return { ok: false, error: REFUSALS.not_found };

  // Capture the address BEFORE it is scrubbed. Sent only after the erasure succeeds.
  const emailTo = user.anonymized_at ? null : user.email;
  const firstName = (user.full_name ?? "there").split(" ")[0];

  const { data, error } = await admin.rpc("anonymize_user", { p_user_id: args.userId });
  if (error) {
    console.error("anonymize_user failed", error);
    return { ok: false, error: "Couldn't erase the account. Nothing was changed — please try again." };
  }
  const result = (data as { result: string } | null)?.result ?? "";
  if (result !== "erased" && result !== "already_erased") return { ok: false, error: REFUSALS[result] ?? "Couldn't erase the account." };

  // Login: soft delete keeps the auth row (so orders' foreign keys hold) but blocks sign-in and frees the real email. Retry-safe.
  const authDelete = await admin.auth.admin.deleteUser(args.userId, true);
  if (authDelete.error && !/not found|already/i.test(authDelete.error.message)) {
    console.error("auth soft-delete failed", authDelete.error);
    return { ok: false, error: "The data was erased but the login could not be disabled. Run it again to finish." };
  }

  await admin.from("audit_logs").insert({
    actor_id: args.actorId, action: args.byAdmin ? "user.erased_by_admin" : "user.erased_self", entity_type: "user", entity_id: args.userId,
    before_data: null, after_data: null, // deliberately no personal data in the trail
  });

  if (emailTo) {
    const mail = buildAccountDeletedEmail({ firstName, byAdmin: args.byAdmin, appUrl: appBaseUrl() });
    const sent = await sendEmail({ to: emailTo, ...mail });
    if (!sent.ok && !sent.notConfigured) console.error("Account-deleted email failed", sent.error);
  }
  return { ok: true };
}

/** Suspend = the app treats them as signed out on the next request (users.is_active) AND their login can't refresh (auth ban). */
export async function setUserSuspended(args: { userId: string; actorId: string; suspended: boolean }): Promise<EraseOutcome> {
  const admin = createAdminClient();
  const { data: user } = await admin.from("users").select("role, anonymized_at").eq("id", args.userId).maybeSingle();
  if (!user) return { ok: false, error: "Account not found." };
  if (user.anonymized_at) return { ok: false, error: "This account has been erased." };
  if (user.role === "admin") return { ok: false, error: "Admin accounts can't be suspended here." };

  const { error } = await admin.from("users").update({ is_active: !args.suspended }).eq("id", args.userId);
  if (error) return { ok: false, error: "Couldn't update the account." };
  const banned = await admin.auth.admin.updateUserById(args.userId, { ban_duration: args.suspended ? "876000h" : "none" });
  if (banned.error) console.error("auth ban update failed", banned.error);

  await admin.from("audit_logs").insert({
    actor_id: args.actorId, action: args.suspended ? "user.suspended" : "user.reinstated", entity_type: "user", entity_id: args.userId, before_data: null, after_data: null,
  });
  return { ok: true };
}

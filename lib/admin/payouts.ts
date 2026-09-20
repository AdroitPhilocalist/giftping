import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { decryptSecret } from "@/lib/security/encryption";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildPayoutPaidEmail } from "@/lib/notifications/templates";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Vendor payouts. Nothing here moves money by itself: an admin creates a settlement (which stamps each delivered line as belonging to it, exactly once),
 * pays the vendor's bank account by hand, then records the bank reference. Every step runs through an atomic SQL function callable only by this trusted
 * server code — the caller (lib/admin/payout-actions.ts) has already verified an admin from the DATABASE role.
 */
export type PayoutResult<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createSettlement(args: { vendorId: string; adminId: string }): Promise<PayoutResult<{ settlementId: string; amount: number }>> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_settlement", { p_vendor_id: args.vendorId, p_admin_id: args.adminId });
  if (error) return { ok: false, error: "Couldn't create the settlement. Nothing was changed." };
  const r = data as { result: string; settlement_id?: string; amount?: number };
  if (r.result === "nothing_payable") return { ok: false, error: "Nothing is payable to this vendor right now (lines become payable after the hold period)." };
  if (r.result !== "created") return { ok: false, error: "Vendor not found." };
  await admin.from("audit_logs").insert({ actor_id: args.adminId, action: "settlement.created", entity_type: "vendor_settlement", entity_id: r.settlement_id!, before_data: null, after_data: { vendor_id: args.vendorId, amount: r.amount } as never });
  return { ok: true, settlementId: r.settlement_id!, amount: Number(r.amount) };
}

export async function markSettlementPaid(args: { settlementId: string; reference: string; adminId: string }): Promise<PayoutResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("mark_settlement_paid", { p_settlement_id: args.settlementId, p_reference: args.reference, p_admin_id: args.adminId });
  if (error) return { ok: false, error: "Couldn't record the payment. Please try again." };
  const r = data as { result: string; amount?: number; vendor_id?: string };
  if (r.result === "reference_required") return { ok: false, error: "Enter the bank reference (UTR / transaction id) — at least 4 characters." };
  if (r.result === "already_settled") return { ok: false, error: "This settlement is already marked as paid." };
  if (r.result === "voided") return { ok: false, error: "This settlement was voided." };
  if (r.result !== "settled") return { ok: false, error: "Settlement not found." };

  await admin.from("audit_logs").insert({ actor_id: args.adminId, action: "settlement.paid", entity_type: "vendor_settlement", entity_id: args.settlementId, before_data: null, after_data: { amount: r.amount, reference: args.reference.trim().slice(0, 100) } as never });

  const [{ data: vendor }, { data: settlement }] = await Promise.all([
    admin.from("vendors").select("business_name, user_id").eq("id", r.vendor_id!).single(),
    admin.from("vendor_settlements").select("item_count").eq("id", args.settlementId).single(),
  ]);
  if (vendor?.user_id) {
    const base = appBaseUrl();
    await notifyUser({
      userId: vendor.user_id, category: "vendor_updates", type: "payout_sent", title: "Payout sent",
      message: `${formatCurrency(Number(r.amount))} has been paid to your bank account (ref ${args.reference.trim()}).`, linkUrl: "/vendor/payouts",
      email: buildPayoutPaidEmail({ vendorName: vendor.business_name, amountLabel: formatCurrency(Number(r.amount)), reference: args.reference.trim(), itemCount: settlement?.item_count ?? 0, payoutsUrl: `${base}/vendor/payouts`, preferencesUrl: `${base}/account/notifications` }),
    });
  }
  return { ok: true };
}

export async function voidSettlement(args: { settlementId: string; note: string; adminId: string }): Promise<PayoutResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("void_settlement", { p_settlement_id: args.settlementId, p_note: args.note });
  if (error) return { ok: false, error: "Couldn't void the settlement." };
  const r = (data as { result: string }).result;
  if (r === "already_settled") return { ok: false, error: "This settlement has been paid, so it can't be voided." };
  if (r === "already_voided") return { ok: false, error: "This settlement is already voided." };
  if (r !== "voided") return { ok: false, error: "Settlement not found." };
  await admin.from("audit_logs").insert({ actor_id: args.adminId, action: "settlement.voided", entity_type: "vendor_settlement", entity_id: args.settlementId, before_data: null, after_data: { note: args.note.slice(0, 300) } as never });
  return { ok: true };
}

/** The ONLY place a full bank account number is decrypted. Every reveal is audit-logged (who, which vendor, when) — the number itself never is. */
export async function revealBankDetails(args: { vendorId: string; adminId: string }): Promise<PayoutResult<{ accountName: string; accountNumber: string; ifsc: string }>> {
  const admin = createAdminClient();
  const { data } = await admin.from("vendor_private").select("bank_account_name, bank_account_number_encrypted, bank_ifsc").eq("vendor_id", args.vendorId).maybeSingle();
  if (!data?.bank_account_number_encrypted) return { ok: false, error: "No bank details on file." };
  let accountNumber: string;
  try {
    accountNumber = decryptSecret(data.bank_account_number_encrypted);
  } catch {
    return { ok: false, error: "Couldn't decrypt the bank details (is VENDOR_BANK_ENCRYPTION_KEY set to the same value that encrypted them?)." };
  }
  await admin.from("audit_logs").insert({ actor_id: args.adminId, action: "vendor.bank_details_revealed", entity_type: "vendor", entity_id: args.vendorId, before_data: null, after_data: null });
  return { ok: true, accountName: data.bank_account_name ?? "", accountNumber, ifsc: data.bank_ifsc ?? "" };
}

import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { RazorpayError, findRazorpayRefundByTag, isRazorpayConfigured, refundRazorpayPayment } from "@/lib/integrations/razorpay";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildReturnUpdateEmail } from "@/lib/notifications/templates";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Partial refunds and return decisions (admin). Order of operations mirrors cancellation and is the whole point:
 *   1. begin_refund   — validate + RESERVE the money in the database (a pending refund counts against the line, so nobody can refund it twice)
 *   2. the gateway    — refund at Razorpay, tagged with our refund id so a retry after a timeout can find it instead of refunding again
 *   3. complete_refund — only now apply the consequences (line totals, vendor payout/commission, debits, restock, return status) atomically
 * A failure at 2 leaves a failed refund that can be retried; nothing is ever applied that the gateway didn't confirm. Every call is safe to repeat.
 */
export type RefundOutcome = { ok: true; message: string } | { ok: false; error: string; retryable?: boolean };

const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));
const money = (n: number | string) => formatCurrency(Number(n));

export async function decideReturn(args: { returnId: string; adminId: string; approve: boolean; note: string }): Promise<RefundOutcome> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("decide_return_request", { p_id: args.returnId, p_admin_id: args.adminId, p_approve: args.approve, p_note: args.note });
  if (error) return { ok: false, error: "Couldn't save the decision. Please try again." };
  const r = data as { result: string; customer_id?: string; vendor_id?: string; order_id?: string; status?: string };
  if (r.result === "not_found") return { ok: false, error: "Return request not found." };
  if (r.result === "not_pending") return { ok: false, error: `This request was already ${r.status}.` };
  if (r.result === "note_required") return { ok: false, error: "Give the customer a reason (at least 5 characters)." };

  await admin.from("audit_logs").insert({
    actor_id: args.adminId, action: args.approve ? "return.approved" : "return.rejected", entity_type: "return_request", entity_id: args.returnId,
    before_data: null, after_data: { note: args.note.slice(0, 300) } as never,
  });

  const { data: request } = await admin
    .from("return_requests")
    .select("id, order:orders ( id, order_number ), item:order_items ( product_name ), customer:users!return_requests_customer_id_fkey ( full_name ), vendor:vendors ( user_id, business_name )")
    .eq("id", args.returnId)
    .single();
  if (request) {
    const order = one(request.order);
    const item = one(request.item);
    const base = appBaseUrl();
    await notifyUser({
      userId: r.customer_id!, category: "order_updates", type: args.approve ? "return_approved" : "return_rejected",
      title: args.approve ? "Return approved" : "Return not approved",
      message: args.approve ? `Your return of ${item?.product_name} was approved. We'll arrange the pickup.` : `We couldn't approve the return of ${item?.product_name}.`,
      linkUrl: `/orders/${order?.id}`,
      email: buildReturnUpdateEmail({
        kind: args.approve ? "approved" : "rejected", firstName: (one(request.customer)?.full_name ?? "there").split(" ")[0],
        orderNumber: order?.order_number ?? "", productName: item?.product_name ?? "your item", note: args.note || null,
        orderUrl: `${base}/orders/${order?.id}`, preferencesUrl: `${base}/account/notifications`,
      }),
    });
    const vendor = one(request.vendor);
    if (args.approve && vendor?.user_id) {
      await notifyUser({
        userId: vendor.user_id, category: "vendor_updates", type: "vendor_return_approved", title: "A return was approved",
        message: `${order?.order_number}: ${item?.product_name} is being returned. The refund will be deducted from your earnings.`, linkUrl: "/vendor/returns",
      });
    }
  }
  return { ok: true, message: args.approve ? "Return approved. Issue the refund once the item is back." : "Return rejected and the customer told." };
}

export async function issueRefund(args: {
  orderItemId: string; amount: number; reason: string; returnRequestId: string | null; returnedQty: number; restock: boolean; adminId: string;
}): Promise<RefundOutcome> {
  if (!isRazorpayConfigured()) return { ok: false, error: "Refunds aren't available: Razorpay isn't configured in this environment." };
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("begin_refund", {
    p_order_item_id: args.orderItemId, p_amount: args.amount, p_reason: args.reason, p_return_request_id: args.returnRequestId as string, // generated types can't express a nullable arg; the SQL accepts null
    p_returned_qty: args.returnedQty, p_restock: args.restock, p_admin_id: args.adminId,
  });
  if (error) {
    console.error("begin_refund failed", error);
    return { ok: false, error: "Couldn't start the refund. Nothing was changed." };
  }
  const r = data as { result: string; refund_id?: string; remaining?: number };
  const known: Record<string, string> = {
    not_found: "Item not found.",
    bad_amount: "Enter an amount above zero.",
    not_delivered: "Only delivered items of a paid order can be refunded here (use “Cancel & refund” before delivery).",
    no_payment: "There's no captured payment on this order to refund.",
    exceeds_payment: "That would refund more than the customer paid for the order.",
    bad_quantity: "That's more units than are left to return.",
    return_not_found: "That return request doesn't belong to this item.",
    return_not_approved: "Approve the return request first.",
    return_already_refunded: "This return has already been refunded.",
  };
  if (r.result === "exceeds_line") return { ok: false, error: `You can refund at most ${money(r.remaining ?? 0)} more on this item (what the customer paid, minus what's already refunded or being refunded).` };
  if (r.result !== "reserved") return { ok: false, error: known[r.result] ?? "Couldn't start the refund." };
  return executeRefund(r.refund_id!, args.adminId);
}

/** Retry a refund that failed at the gateway (or was left pending by a crash). Safe to press repeatedly. */
export async function retryRefund(args: { refundId: string; adminId: string }): Promise<RefundOutcome> {
  if (!isRazorpayConfigured()) return { ok: false, error: "Refunds aren't available: Razorpay isn't configured in this environment." };
  const { data, error } = await createAdminClient().rpc("reopen_refund", { p_refund_id: args.refundId });
  if (error) return { ok: false, error: "Couldn't restart the refund. Please try again." };
  const r = data as { result: string };
  if (r.result === "not_found") return { ok: false, error: "Refund not found." };
  if (r.result === "already_processed") return { ok: true, message: "This refund had already gone through." };
  if (r.result === "exceeds_line") return { ok: false, error: "Other refunds have used up this item's balance since this one failed, so it can't be retried." };
  if (r.result === "return_already_refunded") return { ok: false, error: "This return has since been refunded another way." };
  return executeRefund(args.refundId, args.adminId);
}

async function executeRefund(refundId: string, adminId: string): Promise<RefundOutcome> {
  const admin = createAdminClient();
  const { data: refund } = await admin.from("refunds").select("id, order_id, amount, reason, status").eq("id", refundId).single();
  if (!refund) return { ok: false, error: "Refund not found." };
  const { data: payment } = await admin.from("payments").select("razorpay_payment_id").eq("order_id", refund.order_id).in("status", ["captured", "refunded"]).maybeSingle();
  if (!payment?.razorpay_payment_id) {
    await admin.rpc("fail_refund", { p_refund_id: refundId, p_error: "No gateway payment id" });
    return { ok: false, error: "There's no gateway payment to refund." };
  }

  // ---- 2. the gateway. Look for our own tag first: a previous attempt may have succeeded and only its reply was lost.
  let gatewayId: string;
  try {
    const existing = await findRazorpayRefundByTag(payment.razorpay_payment_id, refundId);
    if (existing) {
      gatewayId = existing.id;
    } else {
      const created = await refundRazorpayPayment(payment.razorpay_payment_id, Math.round(Number(refund.amount) * 100), refund.reason, { gp_refund_id: refundId });
      gatewayId = created.id;
    }
  } catch (error) {
    const message = error instanceof RazorpayError ? error.message : error instanceof Error ? error.message : "unknown error";
    await admin.rpc("fail_refund", { p_refund_id: refundId, p_error: message });
    await admin.from("audit_logs").insert({
      actor_id: adminId, action: "refund.failed", entity_type: "refund", entity_id: refundId, before_data: null, after_data: { error: message.slice(0, 300) } as never,
    });
    return { ok: false, retryable: true, error: `The gateway didn't accept the refund (${message}). Nothing was changed — use “Retry” once it's fixed.` };
  }

  // ---- 3. apply
  const { data, error } = await admin.rpc("complete_refund", { p_refund_id: refundId, p_gateway_refund_id: gatewayId });
  if (error) {
    console.error("complete_refund failed AFTER the gateway refunded", refundId, gatewayId, error);
    return { ok: false, retryable: true, error: "The money was refunded at the gateway but we couldn't record it. Press “Retry” — it will pick up the existing refund and won't refund twice." };
  }
  const c = data as { result: string; order_id?: string; order_number?: string; customer_id?: string; vendor_id?: string; amount?: number; product_name?: string; line_fully_refunded?: boolean; debit?: number };
  if (c.result === "already_processed") return { ok: true, message: "This refund had already been applied." };
  if (c.result !== "processed") return { ok: false, error: "Couldn't record the refund." };

  await admin.from("audit_logs").insert({
    actor_id: adminId, action: "refund.processed", entity_type: "refund", entity_id: refundId, before_data: null,
    after_data: { order_id: c.order_id, amount: c.amount, gateway_refund_id: gatewayId, vendor_debit: c.debit ?? 0 } as never,
  });

  // ---- 4. tell people (best effort; notifyUser never throws)
  const base = appBaseUrl();
  const [{ data: customer }, { data: vendor }] = await Promise.all([
    admin.from("users").select("full_name").eq("id", c.customer_id!).single(),
    admin.from("vendors").select("user_id").eq("id", c.vendor_id!).single(),
  ]);
  await notifyUser({
    userId: c.customer_id!, category: "order_updates", type: "refund_processed", title: "Refund on its way",
    message: `${money(c.amount!)} for ${c.product_name} (order ${c.order_number}) is being refunded to your original payment method.`, linkUrl: `/orders/${c.order_id}`,
    email: buildReturnUpdateEmail({
      kind: "refunded", firstName: (customer?.full_name ?? "there").split(" ")[0], orderNumber: c.order_number!, productName: c.product_name!,
      amountLabel: money(c.amount!), note: null, orderUrl: `${base}/orders/${c.order_id}`, preferencesUrl: `${base}/account/notifications`,
    }),
  });
  if (vendor?.user_id) {
    await notifyUser({
      userId: vendor.user_id, category: "vendor_updates", type: "vendor_refund", title: "A refund affected your earnings",
      message: `${money(c.amount!)} was refunded on ${c.order_number} (${c.product_name}). Your earnings on that item are reduced${c.debit ? `; ${money(c.debit)} is deducted from your next payout` : ""}.`,
      linkUrl: "/vendor/payouts", push: false,
    });
  }
  return { ok: true, message: `${money(c.amount!)} refunded.` };
}

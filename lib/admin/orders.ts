import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { RazorpayError, isRazorpayConfigured, refundRazorpayPayment } from "@/lib/integrations/razorpay";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildOrderCancelledEmail } from "@/lib/notifications/templates";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Admin cancel-and-refund. Order of operations is the point:
 *   1. cancel + restock atomically in the database (a vendor can no longer ship it; stock is back)
 *   2. THEN refund through the gateway
 * so a failure at step 2 leaves a cancelled order with a captured payment, and running this again simply retries the refund.
 * (Refunding first could leave a refunded order that a vendor still ships.) Every call is safe to repeat.
 */
export type CancelOutcome = { ok: true; message: string } | { ok: false; error: string; retryable?: boolean };

export async function cancelAndRefundOrder(args: { orderId: string; adminId: string; reason: string }): Promise<CancelOutcome> {
  const admin = createAdminClient();
  const { orderId, adminId, reason } = args;

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, status, customer_id, customer:users ( full_name )")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return { ok: false, error: "Order not found." };

  const { data: payment } = await admin
    .from("payments")
    .select("id, status, amount, razorpay_payment_id")
    .eq("order_id", orderId)
    .in("status", ["captured", "refunded"])
    .maybeSingle();

  // Refunding needs the gateway. Fail BEFORE cancelling so a misconfigured environment never strands an order half-done.
  if (payment?.status === "captured" && !isRazorpayConfigured()) {
    return { ok: false, error: "Refunds aren't available: Razorpay isn't configured in this environment." };
  }

  // ---- 1. cancel + restock (atomic)
  const { data: cancelled, error: cancelError } = await admin.rpc("cancel_order_and_restock", { p_order_id: orderId, p_reason: reason });
  if (cancelError) {
    console.error("cancel_order_and_restock failed", cancelError);
    return { ok: false, error: "Couldn't cancel the order. Nothing was changed — please try again." };
  }
  const c = cancelled as { result: string; was_paid?: boolean } | null;
  if (!c || c.result === "not_found") return { ok: false, error: "Order not found." };
  if (c.result === "not_cancellable") return { ok: false, error: "This order has already shipped, so it can't be cancelled — handle it as a return." };
  if (c.result === "shipment_booked") return { ok: false, error: "A courier is already booked for this order. Cancel the shipment with the courier first." };
  const cancelledNow = c.result === "cancelled";

  // ---- 2. refund (only if money was actually taken and not yet returned)
  let refundedNow = false;
  if (payment?.status === "captured" && payment.razorpay_payment_id) {
    const amountPaise = Math.round(Number(payment.amount) * 100);
    try {
      const refund = await refundRazorpayPayment(payment.razorpay_payment_id, amountPaise, reason);
      await admin
        .from("payments")
        .update({ status: "refunded", refund_id: refund.id, refund_reason: reason, refunded_at: new Date().toISOString() })
        .eq("id", payment.id);
      refundedNow = true;
    } catch (error) {
      if (error instanceof RazorpayError && /already.*refund|fully refunded/i.test(error.message)) {
        await admin.from("payments").update({ status: "refunded", refund_reason: reason, refunded_at: new Date().toISOString() }).eq("id", payment.id);
        refundedNow = true;
      } else {
        const message = error instanceof Error ? error.message : "unknown error";
        await admin.from("payments").update({ failure_reason: `REFUND_FAILED: ${message}`.slice(0, 500) }).eq("id", payment.id);
        await admin.from("audit_logs").insert({
          actor_id: adminId, action: "order.cancelled_refund_failed", entity_type: "order", entity_id: orderId,
          before_data: null, after_data: { reason, error: message } as never,
        });
        return { ok: false, retryable: true, error: `The order is cancelled and stock restored, but the refund failed (${message}). Use "Retry refund" once the problem is fixed.` };
      }
    }
  }

  if (!cancelledNow && !refundedNow) return { ok: true, message: "Nothing to do — this order was already cancelled and refunded." };

  await admin.from("audit_logs").insert({
    actor_id: adminId, action: "order.cancelled", entity_type: "order", entity_id: orderId,
    before_data: { status: order.status } as never, after_data: { reason, refunded: refundedNow, amount: payment?.amount ?? 0 } as never,
  });

  // ---- 3. tell people (best effort; notifyUser never throws)
  const base = appBaseUrl();
  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const refundLabel = refundedNow ? formatCurrency(Number(payment!.amount)) : null;
  await notifyUser({
    userId: order.customer_id,
    category: "order_updates",
    type: "order_cancelled",
    title: "Order cancelled",
    message: refundLabel ? `Order ${order.order_number} was cancelled. ${refundLabel} is being refunded.` : `Order ${order.order_number} was cancelled.`,
    linkUrl: `/orders/${order.id}`,
    email: buildOrderCancelledEmail({
      firstName: (customer?.full_name ?? "there").split(" ")[0],
      orderNumber: order.order_number,
      refundLabel,
      reason,
      supportNote: "If you didn't expect this, just reply to this email and we'll help.",
      orderUrl: `${base}/orders/${order.id}`,
      preferencesUrl: `${base}/account/notifications`,
    }),
  });

  if (cancelledNow && c.was_paid) {
    const { data: vendors } = await admin.from("order_items").select("vendor:vendors ( user_id )").eq("order_id", orderId);
    const vendorUsers = new Set((vendors ?? []).map((v) => (Array.isArray(v.vendor) ? v.vendor[0] : v.vendor)?.user_id).filter((id): id is string => !!id));
    for (const userId of vendorUsers) {
      await notifyUser({
        userId, category: "vendor_updates", type: "vendor_order_cancelled", title: "Order cancelled — don't ship",
        message: `Order ${order.order_number} was cancelled. Please don't dispatch it.`, linkUrl: "/vendor/orders",
      });
    }
  }

  return { ok: true, message: refundLabel ? `Order cancelled and ${refundLabel} refunded.` : "Order cancelled." };
}

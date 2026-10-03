import "server-only";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import {
  RazorpayError,
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  razorpayCredentials,
  refundRazorpayPayment,
} from "@/lib/integrations/razorpay";
import { verifyCheckoutSignature } from "@/lib/integrations/razorpay-signature";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildOrderConfirmedEmail, buildVendorNewOrderEmail } from "@/lib/notifications/templates";
import { formatCurrency } from "@/lib/utils/format";

/**
 * Payment flow, and where the truth lives:
 *
 *   order page ──startPayment──▶ Razorpay order for the SERVER-STORED total (never a client amount)
 *   Razorpay Checkout (browser) ──▶ the shopper pays
 *        ├─ browser callback ──▶ verifyClientPayment  (signature + re-fetch from Razorpay) ─┐  fast path, for UX
 *        └─ Razorpay webhook ──▶ /api/webhooks/razorpay (signed, idempotent)               ─┤  SOURCE OF TRUTH
 *                                                                                           ▼
 *                                                          confirmCaptured ─▶ confirm_order_payment() (SQL, atomic)
 *
 * Both paths converge on the same idempotent SQL function, so it doesn't matter which arrives first, or
 * whether the browser callback never arrives at all (tab closed, network drop) — the webhook alone completes the order.
 */

const toPaise = (rupees: number) => Math.round(rupees * 100);

export type StartPaymentResult =
  | { ok: true; keyId: string; razorpayOrderId: string; amountPaise: number; orderNumber: string }
  | { ok: false; error: string };

/** The engraving text on an order line's personalisation, if any (the boutique must carry it out exactly, so it goes in their new-order email). */
function engravingOf(p: unknown): string | null {
  const v = p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>).engraving : null;
  return typeof v === "string" && v.trim() ? v : null;
}

export async function startPayment(userId: string, orderId: string): Promise<StartPaymentResult> {
  if (!isRazorpayConfigured()) {
    return { ok: false, error: "Online payments aren't switched on yet. Please check back soon." };
  }

  // Read as the shopper (RLS): they can only ever pay for their own order.
  const client = await createClient();
  const { data: order } = await client
    .from("orders")
    .select("id, order_number, status, total_amount, razorpay_order_id, items:order_items ( product_id, quantity )")
    .eq("id", orderId)
    .eq("customer_id", userId)
    .maybeSingle();
  if (!order) return { ok: false, error: "We couldn't find that order." };
  if (order.status !== "created" && order.status !== "payment_initiated") {
    return { ok: false, error: "This order can't be paid for any more." };
  }

  const admin = createAdminClient();

  // Don't take money for something that has just sold out. (The SQL fulfilment step re-checks atomically and
  // refunds if it races; this just spares the shopper the round trip in the common case.)
  const productIds = Array.from(new Set(order.items.map((i) => i.product_id).filter((id): id is string => !!id)));
  const { data: products } = await admin.from("products").select("id, name, status, stock_quantity").in("id", productIds);
  const byId = new Map((products ?? []).map((p) => [p.id, p]));
  for (const item of order.items) {
    const p = item.product_id ? byId.get(item.product_id) : undefined;
    if (!p || p.status !== "active" || p.stock_quantity < item.quantity) {
      return { ok: false, error: `${p?.name ?? "An item"} just sold out — please review your cart and check out again.` };
    }
  }

  const amountPaise = toPaise(Number(order.total_amount));
  const creds = razorpayCredentials()!;

  let razorpayOrderId = order.razorpay_order_id;
  if (!razorpayOrderId) {
    let created;
    try {
      created = await createRazorpayOrder({ amountPaise, receipt: order.order_number, notes: { order_id: order.id } });
    } catch (error) {
      console.error("Razorpay order creation failed", error);
      return { ok: false, error: "We couldn't start the payment. Please try again in a moment." };
    }

    // Claim it: if two clicks race, only one Razorpay order id is stored and both callers use that one.
    const { data: claimed } = await admin
      .from("orders")
      .update({ razorpay_order_id: created.id, status: "payment_initiated" })
      .eq("id", order.id)
      .is("razorpay_order_id", null)
      .in("status", ["created", "payment_initiated"])
      .select("razorpay_order_id");

    if (claimed && claimed.length > 0) {
      razorpayOrderId = created.id;
      await admin
        .from("payments")
        .upsert(
          { order_id: order.id, razorpay_order_id: created.id, amount: amountPaise / 100, status: "pending" },
          { onConflict: "razorpay_order_id", ignoreDuplicates: true },
        );
    } else {
      const { data: current } = await admin.from("orders").select("razorpay_order_id").eq("id", order.id).single();
      razorpayOrderId = current?.razorpay_order_id ?? null;
    }
  }
  if (!razorpayOrderId) return { ok: false, error: "We couldn't start the payment. Please try again." };

  return { ok: true, keyId: creds.keyId, razorpayOrderId, amountPaise, orderNumber: order.order_number };
}

// ---------------------------------------------------------------------------
// Fulfilment
// ---------------------------------------------------------------------------

export type ConfirmOutcome =
  | { result: "confirmed"; orderId: string }
  | { result: "already"; orderId: string }
  | { result: "refunded"; orderId: string; reason: string }
  | { result: "unknown_order" };

/**
 * A captured payment (proven by a verified webhook or a payment re-fetched from Razorpay) -> the order.
 * Throws if a needed refund could not be issued, so the caller answers 5xx and Razorpay retries the webhook;
 * every step is idempotent, so a retry is safe.
 */
export async function confirmCaptured(args: {
  razorpayOrderId: string;
  paymentId: string;
  amountPaise: number;
  method: string | null;
}): Promise<ConfirmOutcome> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("confirm_order_payment", {
    p_razorpay_order_id: args.razorpayOrderId,
    p_razorpay_payment_id: args.paymentId,
    p_amount_paise: args.amountPaise,
    p_method: args.method ?? "",
  });
  if (error) throw error;

  const r = data as { result: string; order_id?: string; reason?: string } | null;
  if (!r) throw new Error("confirm_order_payment returned nothing");

  if (r.result === "confirmed") {
    await notifyOrderConfirmed(r.order_id!).catch((e) => console.error("Order notifications failed", e));
    return { result: "confirmed", orderId: r.order_id! };
  }
  if (r.result === "already") return { result: "already", orderId: r.order_id! };
  if (r.result === "refund_needed") {
    await refundPayment({
      paymentId: args.paymentId,
      amountPaise: args.amountPaise,
      reason: r.reason ?? "REFUND",
      orderId: r.order_id!,
    });
    return { result: "refunded", orderId: r.order_id!, reason: r.reason ?? "REFUND" };
  }
  return { result: "unknown_order" };
}

async function refundPayment(args: { paymentId: string; amountPaise: number; reason: string; orderId: string }) {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("payments")
    .select("status")
    .eq("razorpay_payment_id", args.paymentId)
    .maybeSingle();
  if (existing?.status === "refunded") return; // a retried webhook after a successful refund

  try {
    const refund = await refundRazorpayPayment(args.paymentId, args.amountPaise, args.reason);
    await admin
      .from("payments")
      .update({ status: "refunded", refund_id: refund.id, refund_reason: args.reason, refunded_at: new Date().toISOString() })
      .eq("razorpay_payment_id", args.paymentId);
  } catch (error) {
    // "Already fully refunded" means an earlier attempt did succeed.
    if (error instanceof RazorpayError && /already.*refund|fully refunded/i.test(error.message)) {
      await admin
        .from("payments")
        .update({ status: "refunded", refund_reason: args.reason, refunded_at: new Date().toISOString() })
        .eq("razorpay_payment_id", args.paymentId);
    } else {
      await admin
        .from("payments")
        .update({ failure_reason: `${args.reason}; REFUND_FAILED: ${(error as Error).message}`.slice(0, 500) })
        .eq("razorpay_payment_id", args.paymentId);
      throw error;
    }
  }

  await admin.from("audit_logs").insert({
    actor_id: null,
    action: "payment.auto_refunded",
    entity_type: "order",
    entity_id: args.orderId,
    before_data: null,
    after_data: { payment_id: args.paymentId, amount_paise: args.amountPaise, reason: args.reason } as never,
  });
}

export async function recordPaymentFailure(args: { razorpayOrderId: string; reason: string }) {
  // Never downgrade a captured/refunded payment (a late "failed" event for an earlier attempt on the same order).
  await createAdminClient()
    .from("payments")
    .update({ status: "failed", failure_reason: args.reason.slice(0, 300) })
    .eq("razorpay_order_id", args.razorpayOrderId)
    .in("status", ["pending", "processing"]);
}

async function notifyOrderConfirmed(orderId: string) {
  const admin = createAdminClient();
  const { data: order } = await admin
    .from("orders")
    .select(
      `id, order_number, customer_id, total_amount, delivery_address,
       customer:users ( full_name ),
       items:order_items ( product_name, quantity, total_price, discount_amount, variant_label, personalization, vendor_id,
         vendor:vendors ( business_name, user_id ), financials:order_item_financials ( vendor_payout ) )`,
    )
    .eq("id", orderId)
    .single();
  if (!order) return;

  const base = appBaseUrl();
  const prefsUrl = `${base}/account/notifications`;
  const customer = Array.isArray(order.customer) ? order.customer[0] : order.customer;
  const addr = (order.delivery_address ?? {}) as Record<string, string | null>;

  await notifyUser({
    userId: order.customer_id,
    category: "order_updates",
    type: "order_confirmed",
    title: "Order confirmed",
    message: `Thank you! Order ${order.order_number} is confirmed and on its way to being packed.`,
    linkUrl: `/orders/${order.id}`,
    email: buildOrderConfirmedEmail({
      firstName: (customer?.full_name ?? "there").split(" ")[0],
      orderNumber: order.order_number,
      items: order.items.map((i) => ({
        name: i.product_name,
        quantity: i.quantity,
        totalLabel: formatCurrency(Number(i.total_price) - Number(i.discount_amount)),
        detail: i.variant_label,
      })),
      totalLabel: formatCurrency(Number(order.total_amount)),
      deliverTo: {
        name: addr.recipient_name ?? "",
        line: [addr.address_line1, addr.city, addr.state].filter(Boolean).join(", ") + (addr.pincode ? ` — ${addr.pincode}` : ""),
      },
      orderUrl: `${base}/orders/${order.id}`,
      preferencesUrl: prefsUrl,
    }),
  });

  // one message per vendor (a two-vendor order tells each vendor only about their own lines)
  const byVendor = new Map<string, typeof order.items>();
  for (const item of order.items) byVendor.set(item.vendor_id, [...(byVendor.get(item.vendor_id) ?? []), item]);
  for (const items of byVendor.values()) {
    const vendor = Array.isArray(items[0].vendor) ? items[0].vendor[0] : items[0].vendor;
    if (!vendor?.user_id) continue;
    const earnings = items.reduce((sum, i) => sum + Number((Array.isArray(i.financials) ? i.financials[0] : i.financials)?.vendor_payout ?? 0), 0);
    await notifyUser({
      userId: vendor.user_id,
      category: "vendor_updates",
      type: "vendor_new_order",
      title: "New order",
      message: `You have a new paid order (${order.order_number}). Accept it and book a courier from your dashboard.`,
      linkUrl: "/vendor/orders",
      email: buildVendorNewOrderEmail({
        vendorName: vendor.business_name,
        orderNumber: order.order_number,
        items: items.map((i) => ({ name: i.product_name, quantity: i.quantity, engraving: engravingOf(i.personalization) })),
        earningsLabel: earnings > 0 ? formatCurrency(earnings) : null,
        dashboardUrl: `${base}/vendor/orders`,
        preferencesUrl: prefsUrl,
      }),
    });
  }
}

// ---------------------------------------------------------------------------
// Browser callback (fast path)
// ---------------------------------------------------------------------------

export type ClientVerifyResult =
  | { ok: true; status: "confirmed" | "pending" | "refunded" }
  | { ok: false; error: string };

export async function verifyClientPayment(args: {
  userId: string;
  orderId: string;
  razorpayOrderId: string;
  paymentId: string;
  signature: string;
}): Promise<ClientVerifyResult> {
  const creds = razorpayCredentials();
  if (!creds) return { ok: false, error: "Payments aren't configured." };

  const client = await createClient();
  const { data: order } = await client
    .from("orders")
    .select("id, razorpay_order_id, status")
    .eq("id", args.orderId)
    .eq("customer_id", args.userId)
    .maybeSingle();
  if (!order || !order.razorpay_order_id || order.razorpay_order_id !== args.razorpayOrderId) {
    return { ok: false, error: "That payment doesn't match this order." };
  }

  if (
    !verifyCheckoutSignature({
      razorpayOrderId: args.razorpayOrderId,
      razorpayPaymentId: args.paymentId,
      signature: args.signature,
      keySecret: creds.keySecret,
    })
  ) {
    return { ok: false, error: "We couldn't verify that payment." };
  }

  // The signature proves Razorpay issued this payment id for this order; the amount and state still come from
  // Razorpay itself, not from the browser.
  let payment = await fetchRazorpayPayment(args.paymentId);
  if (payment.order_id !== args.razorpayOrderId) return { ok: false, error: "That payment doesn't match this order." };
  if (payment.status === "authorized") payment = await captureRazorpayPayment(payment.id, payment.amount);
  if (payment.status !== "captured") return { ok: true, status: "pending" };

  const outcome = await confirmCaptured({
    razorpayOrderId: args.razorpayOrderId,
    paymentId: payment.id,
    amountPaise: payment.amount,
    method: payment.method ?? null,
  });
  if (outcome.result === "refunded") return { ok: true, status: "refunded" };
  return { ok: true, status: "confirmed" };
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

interface WebhookEntity {
  id?: string;
  order_id?: string | null;
  amount?: number;
  method?: string | null;
  error_description?: string | null;
}
export interface RazorpayWebhookEvent {
  event: string;
  payload?: { payment?: { entity?: WebhookEntity }; order?: { entity?: WebhookEntity } };
}

export async function processWebhookEvent(event: RazorpayWebhookEvent): Promise<string> {
  const payment = event.payload?.payment?.entity;

  switch (event.event) {
    case "payment.authorized": {
      // With auto-capture Razorpay still sends this for payments that are already captured, and capturing twice
      // errors — so look at the payment's real state first. Only a genuinely "authorized" payment is captured here.
      if (!payment?.id || !payment.order_id) return "ignored:malformed";
      let current = await fetchRazorpayPayment(payment.id);
      if (current.status === "authorized") current = await captureRazorpayPayment(current.id, current.amount);
      if (current.status !== "captured") return `payment_${current.status}`;
      return (
        await confirmCaptured({ razorpayOrderId: payment.order_id, paymentId: current.id, amountPaise: current.amount, method: current.method ?? payment.method ?? null })
      ).result;
    }
    case "payment.captured":
    case "order.paid": {
      if (!payment?.id || !payment.order_id || typeof payment.amount !== "number") return "ignored:malformed";
      return (
        await confirmCaptured({ razorpayOrderId: payment.order_id, paymentId: payment.id, amountPaise: payment.amount, method: payment.method ?? null })
      ).result;
    }
    case "payment.failed": {
      if (!payment?.order_id) return "ignored:malformed";
      await recordPaymentFailure({ razorpayOrderId: payment.order_id, reason: payment.error_description ?? "Payment failed" });
      return "failure_recorded";
    }
    default:
      return "ignored";
  }
}

import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, Clock, ExternalLink, Truck, XCircle } from "lucide-react";
import { SHIPMENT_STATUS_LABEL } from "@/lib/integrations/shiprocket-status";
import { PayNowButton } from "@/components/shop/PayNowButton";
import { CancelReturnButton, RequestReturnButton } from "@/components/shop/ReturnRequestControls";
import { isRazorpayConfigured } from "@/lib/integrations/razorpay";
import { ProductImage } from "@/components/shop/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { getServerUser } from "@/lib/auth/session";
import { RETURN_REASONS, returnWindow, type ReturnReason } from "@/lib/commerce/refunds";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { getMyOrder } from "@/lib/db/orders";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Your Order — GiftPing" };

const STATUS_LABEL: Record<string, string> = {
  created: "Awaiting payment",
  payment_initiated: "Payment in progress",
  payment_verified: "Payment received",
  confirmed: "Confirmed",
  processing: "Being prepared",
  partially_shipped: "Partly shipped",
  shipped: "Shipped",
  partially_delivered: "Partly delivered",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

interface Address {
  recipient_name?: string;
  phone?: string;
  address_line1?: string;
  address_line2?: string | null;
  landmark?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
}

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const user = await getServerUser();
  if (!user) notFound(); // proxy.ts redirects signed-out visitors first
  const order = await getMyOrder(id, user.id);
  if (!order) notFound();

  const windowDays = await getReturnWindowDays();
  const address = (order.delivery_address ?? {}) as Address;
  const byVendor = new Map<string, { name: string; items: typeof order.items }>();
  for (const item of order.items) {
    const group = byVendor.get(item.vendor_id) ?? { name: item.vendor?.business_name ?? "Vendor", items: [] };
    group.items.push(item);
    byVendor.set(item.vendor_id, group);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-brand-dark/60">Order</p>
          <h1 className="font-heading text-3xl text-brand-dark">{order.order_number}</h1>
        </div>
        <Badge variant={order.status === "created" || order.status === "payment_initiated" ? "gold" : "primary"}>{STATUS_LABEL[order.status] ?? order.status}</Badge>
      </div>

      {order.status === "created" || order.status === "payment_initiated" ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-brand-secondary/40 bg-brand-accent/60 p-4 text-sm text-brand-dark">
          <p className="flex gap-3">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" />
            <span>Your order is saved and the total is locked in. Complete the payment to confirm it — nothing has been charged yet.</span>
          </p>
          <PayNowButton orderId={order.id} total={Number(order.total_amount)} enabled={isRazorpayConfigured()} />
        </div>
      ) : null}

      {["confirmed", "processing"].includes(order.status) ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4 text-sm text-brand-dark">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-primary" />
          <p>Payment received — thank you! Each vendor will now prepare and dispatch their part of your order.</p>
        </div>
      ) : null}

      {order.status === "cancelled" || order.status === "refunded" ? (
        <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            This order was cancelled. If any payment was taken it is refunded automatically to the original payment method
            (usually within 5–7 working days).
          </p>
        </div>
      ) : null}

      {byVendor.size > 0 && ["confirmed", "processing", "partially_shipped", "shipped", "partially_delivered", "delivered"].includes(order.status) ? (
        <section aria-labelledby="delivery-heading" className="mt-8">
          <h2 id="delivery-heading" className="font-heading text-xl text-brand-dark">
            Delivery
          </h2>
          <div className="mt-3 space-y-3">
            {Array.from(byVendor.entries()).map(([vendorId, group]) => {
              const shipment = order.shipments.find((s) => s.vendor_id === vendorId && !s.is_return && s.status !== "cancelled");
              const allPending = group.items.every((i) => i.fulfilment_status === "pending");
              const sorted = [...(shipment?.events ?? [])].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
              // Once delivered, the journey ends there: hide any stray scans the courier sent after the delivery scan.
              const deliveredAt = shipment?.status === "delivered" ? sorted.find((e) => e.raw_status === "DELIVERED")?.occurred_at : undefined;
              const events = deliveredAt ? sorted.filter((e) => +new Date(e.occurred_at) <= +new Date(deliveredAt)) : sorted;
              return (
                <div key={vendorId} className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-heading text-brand-dark">{group.name}</p>
                    <Badge variant={shipment?.status === "delivered" ? "primary" : "gold"}>
                      {shipment?.awb_number
                        ? (SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status)
                        : allPending
                          ? "Awaiting the vendor"
                          : "Being packed"}
                    </Badge>
                  </div>
                  {shipment?.awb_number ? (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-brand-dark/70">
                      <p className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-brand-secondary-dark" />
                        {shipment.courier_name ?? "Courier"} · AWB {shipment.awb_number}
                        {shipment.estimated_delivery ? ` · expected by ${new Date(shipment.estimated_delivery).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
                      </p>
                      {shipment.tracking_url ? (
                        <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-primary underline">
                          Track on courier site <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-brand-dark/60">
                      {allPending ? "The vendor will accept your order shortly." : "The vendor is packing your gift and will book a courier soon."}
                    </p>
                  )}
                  {events.length > 0 ? (
                    <ol className="mt-3 space-y-2 border-l-2 border-brand-dark/10 pl-4">
                      {events.slice(0, 8).map((e) => (
                        <li key={e.id} className="relative text-xs text-brand-dark/70">
                          <span className="absolute -left-[1.4rem] top-1 h-2 w-2 rounded-full bg-brand-secondary" />
                          <span className="font-medium text-brand-dark">{e.activity ?? e.raw_status.toLowerCase()}</span>
                          {e.location ? ` — ${e.location}` : ""}
                          <span className="block text-brand-dark/40">
                            {new Date(e.occurred_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {Array.from(byVendor.entries()).map(([vendorId, group]) => (
            <section key={vendorId} className="rounded-2xl border border-brand-dark/10 bg-white p-4">
              <h2 className="border-b border-brand-dark/10 pb-2 font-heading text-sm text-brand-dark">{group.name}</h2>
              <ul className="divide-y divide-brand-dark/10">
                {group.items.map((item) => {
                  const p = (item.personalization ?? {}) as Record<string, string>;
                  const paid = Number(item.total_price) - Number(item.discount_amount);
                  const requests = order.return_requests.filter((r) => r.order_item_id === item.id).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
                  const openRequest = requests.find((r) => r.status === "requested" || r.status === "approved") ?? null;
                  const refundedNow = order.refunds.filter((r) => r.order_item_id === item.id && r.status === "processed").reduce((s, r) => s + Number(r.amount), 0);
                  const refundInProgress = order.refunds.some((r) => r.order_item_id === item.id && r.status !== "processed");
                  const deliveredAt = order.shipments.find((s) => s.vendor_id === item.vendor_id && !s.is_return && s.status === "delivered")?.delivered_at ?? null;
                  const window = returnWindow({ deliveredAt, windowDays });
                  const canRequest = item.fulfilment_status === "delivered" && window.open && !openRequest && item.returned_quantity < item.quantity && Number(item.refunded_amount) < paid;
                  const lastRequest = requests[0] ?? null;
                  return (
                    <li key={item.id} className="flex flex-wrap gap-3 py-3 text-sm">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-dark/10">
                        <ProductImage src={item.product_image} alt={item.product_name} className="h-full w-full" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-brand-dark">{item.product_name}</p>
                        {item.variant_label ? <p className="text-xs text-brand-dark/60">{item.variant_label}</p> : null}
                        {p.recipientName || p.occasion || p.giftMessage ? (
                          <p className="text-xs text-brand-dark/60">
                            {[p.recipientName && `For ${p.recipientName}`, p.occasion, p.giftMessage && `“${p.giftMessage}”`].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        <p className="text-xs text-brand-dark/50">
                          Qty {item.quantity} × {formatCurrency(Number(item.unit_price))}
                        </p>
                      </div>
                      <p className="font-medium text-brand-dark">{formatCurrency(Number(item.total_price))}</p>
                      {(refundedNow > 0 || refundInProgress || openRequest || lastRequest || canRequest) ? (
                        <div className="w-full space-y-1 border-t border-dashed border-brand-dark/10 pt-2 text-xs sm:pl-[4.75rem]">
                          {refundedNow > 0 ? <p className="text-brand-primary">{formatCurrency(refundedNow)} refunded to your original payment method (usually 5–7 working days).</p> : null}
                          {refundInProgress ? <p className="text-brand-dark/70">A refund is being processed.</p> : null}
                          {openRequest ? (
                            <p className="flex flex-wrap items-center gap-2 text-brand-dark/80">
                              <span>{openRequest.status === "requested" ? "Return requested — we're reviewing it" : "Return approved — we'll arrange the pickup"} ({RETURN_REASONS[openRequest.reason as ReturnReason] ?? openRequest.reason}).</span>
                              {openRequest.status === "requested" ? <CancelReturnButton returnId={openRequest.id} /> : null}
                            </p>
                          ) : lastRequest && lastRequest.status === "rejected" ? (
                            <p className="text-brand-dark/70">Your return request wasn&apos;t approved{lastRequest.decision_note ? `: ${lastRequest.decision_note}` : "."}</p>
                          ) : null}
                          {canRequest ? (
                            <RequestReturnButton
                              orderItemId={item.id} productName={item.product_name} maxQuantity={item.quantity - item.returned_quantity}
                              closesOn={window.closesAt ? window.closesAt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : null}
                            />
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
            <h2 className="font-heading text-base text-brand-dark">Deliver to</h2>
            <p className="mt-2 font-medium text-brand-dark">{address.recipient_name}</p>
            <p className="text-brand-dark/70">{[address.address_line1, address.address_line2, address.landmark].filter(Boolean).join(", ")}</p>
            <p className="text-brand-dark/70">
              {address.city}, {address.state} — {address.pincode}
            </p>
            <p className="text-brand-dark/60">Mobile: {address.phone}</p>
            {order.gift_message ? <p className="mt-3 text-xs italic text-brand-dark/60">Gift message: “{order.gift_message}”</p> : null}
          </section>

          <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
            <h2 className="font-heading text-base text-brand-dark">Summary</h2>
            <dl className="mt-3 space-y-2">
              <SummaryRow label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
              {Number(order.discount_amount) > 0 ? (
                <SummaryRow label={`Coupon ${order.coupon_code ?? ""}`.trim()} value={`− ${formatCurrency(Number(order.discount_amount))}`} />
              ) : null}
              <SummaryRow label="Delivery" value={Number(order.delivery_charge) === 0 ? "Free" : formatCurrency(Number(order.delivery_charge))} />
              {order.gift_wrap_selected ? <SummaryRow label="Gift wrapping" value={formatCurrency(Number(order.gift_wrap_charge))} /> : null}
              <div className="flex justify-between border-t border-brand-dark/10 pt-3 font-heading text-lg text-brand-dark">
                <dt>Total</dt>
                <dd>{formatCurrency(Number(order.total_amount))}</dd>
              </div>
              <p className="text-xs text-brand-dark/50">Includes {formatCurrency(Number(order.gst_amount))} GST.</p>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brand-dark/60">{label}</dt>
      <dd className="text-brand-dark">{value}</dd>
    </div>
  );
}

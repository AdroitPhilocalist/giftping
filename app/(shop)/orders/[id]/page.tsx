import { personalizationSummary } from "@/lib/commerce/personalization";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ExternalLink, Truck, Zap } from "lucide-react";
import { OrderCelebration } from "@/components/orders/OrderCelebration";
import { OrderHero } from "@/components/orders/OrderHero";
import { OrderStepper } from "@/components/orders/OrderStepper";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { wrapStyleLabel } from "@/lib/commerce/wrap-styles";
import { ORDER_STATUS_LABEL } from "@/lib/shop/order-labels";
import { describeOrderProgress } from "@/lib/shop/order-progress";
import { SHIPMENT_STATUS_LABEL } from "@/lib/integrations/shiprocket-status";
import { PayNowButton } from "@/components/shop/PayNowButton";
import { CancelReturnButton, RequestReturnButton } from "@/components/shop/ReturnRequestControls";
import { isRazorpayConfigured } from "@/lib/integrations/razorpay";
import { ProductImage } from "@/components/shop/ProductImage";
import { WriteReviewButton } from "@/components/shop/ReviewDialogs";
import { Badge } from "@/components/ui/Badge";
import { getServerUser } from "@/lib/auth/session";
import { RETURN_REASONS, returnWindow, type ReturnReason } from "@/lib/commerce/refunds";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { getMyOrder } from "@/lib/db/orders";
import { getReviewedProductIds } from "@/lib/db/reviews";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Your Order — GiftPing" };


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

  // windowDays/theme/reviewedProductIds don't depend on the order itself — fetch alongside it, not after it.
  const [order, windowDays, theme, reviewedProductIds] = await Promise.all([getMyOrder(id, user.id), getReturnWindowDays(), getActiveTheme(), getReviewedProductIds(user.id)]);
  if (!order) notFound();

  const progress = describeOrderProgress(order.status);
  const address = (order.delivery_address ?? {}) as Address;
  const byVendor = new Map<string, { name: string; items: typeof order.items }>();
  for (const item of order.items) {
    const group = byVendor.get(item.vendor_id) ?? { name: item.vendor?.business_name ?? "Vendor", items: [] };
    group.items.push(item);
    byVendor.set(item.vendor_id, group);
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10 sm:px-6 lg:px-8">
      <OrderCelebration />
      <Link href="/orders" className="mb-4 inline-block text-sm text-brand-dark/60 hover:text-brand-dark hover:underline">← All orders</Link>
      <OrderHero
        orderNumber={order.order_number}
        placedOn={new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        statusLabel={ORDER_STATUS_LABEL[order.status] ?? order.status}
        progress={progress}
        backdrop={siteImage("order-hero", theme.id)}
      >
        {order.status === "created" || order.status === "payment_initiated" ? (
          <PayNowButton orderId={order.id} total={Number(order.total_amount)} enabled={isRazorpayConfigured()} />
        ) : null}
      </OrderHero>

      {progress.completed !== null ? (
        <div className="mx-auto -mt-5 max-w-3xl rounded-card border border-brand-dark/[0.06] bg-brand-surface px-4 py-5 shadow-lift sm:px-8">
          <OrderStepper completed={progress.completed} />
        </div>
      ) : null}

      {byVendor.size > 0 && ["confirmed", "processing", "partially_shipped", "shipped", "partially_delivered", "delivered"].includes(order.status) ? (
        <section aria-labelledby="delivery-heading" className="mt-8">
          <h2 id="delivery-heading" className="font-heading text-2xl text-brand-dark">
            Where your gifts are
          </h2>
          <div className="mt-3 space-y-3">
            {Array.from(byVendor.entries()).map(([vendorId, group]) => {
              const shipment = order.shipments.find((s) => s.vendor_id === vendorId && !s.is_return && s.status !== "cancelled");
              const allPending = group.items.every((i) => i.fulfilment_status === "pending");
              const sorted = [...(shipment?.events ?? [])].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at));
              // Once delivered, the journey ends there: hide any stray scans the courier sent after the delivery scan.
              const deliveredAt = shipment?.status === "delivered" ? sorted.find((e) => e.raw_status === "DELIVERED")?.occurred_at : undefined;
              const events = deliveredAt ? sorted.filter((e) => +new Date(e.occurred_at) <= +new Date(deliveredAt)) : sorted;
              const expressRequested = (order.delivery_speed as Record<string, { speed?: string }> | null)?.[vendorId]?.speed === "express";
              return (
                <div key={vendorId} className="rounded-card border border-brand-dark/10 bg-brand-surface shadow-card p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="flex items-center gap-1.5 font-heading text-brand-dark">
                      {group.name}
                      {expressRequested ? <span className="flex items-center gap-1 rounded-full bg-brand-secondary/15 px-2 py-0.5 font-sans text-[11px] font-semibold text-brand-secondary-dark"><Zap className="h-3 w-3" /> Express</span> : null}
                    </p>
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
            <section key={vendorId} className="rounded-card border border-brand-dark/10 bg-brand-surface shadow-card p-4">
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
                  const returnPickup = order.shipments.find((s) => s.vendor_id === item.vendor_id && s.is_return && s.status !== "cancelled" && s.awb_number) ?? null;
                  const window = returnWindow({ deliveredAt, windowDays });
                  const canRequest = item.fulfilment_status === "delivered" && window.open && !openRequest && item.returned_quantity < item.quantity && Number(item.refunded_amount) < paid;
                  const lastRequest = requests[0] ?? null;
                  const isDelivered = item.fulfilment_status === "delivered";
                  // product_id is nullable at the type level (a defensive FK column), but every real order item has one —
                  // a null here would mean the product row itself is gone, which nothing in this app currently does.
                  const canReview = isDelivered && Boolean(item.product_id);
                  const hasReview = item.product_id ? reviewedProductIds.has(item.product_id) : false;
                  return (
                    <li key={item.id} className="flex flex-wrap gap-3 py-3 text-sm">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-brand-dark/10">
                        <ProductImage src={item.product_image} alt={item.product_name} className="h-full w-full" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-brand-dark">{item.product_name}</p>
                        {item.variant_label ? <p className="text-xs text-brand-dark/60">{item.variant_label}</p> : null}
                        {personalizationSummary(p) ? <p className="text-xs text-brand-dark/60">{personalizationSummary(p)}</p> : null}
                        <p className="text-xs text-brand-dark/50">
                          Qty {item.quantity} × {formatCurrency(Number(item.unit_price))}
                        </p>
                      </div>
                      <p className="font-medium text-brand-dark">{formatCurrency(Number(item.total_price))}</p>
                      {(refundedNow > 0 || refundInProgress || openRequest || lastRequest || canRequest || isDelivered) ? (
                        <div className="w-full space-y-1 border-t border-dashed border-brand-dark/10 pt-2 text-xs sm:pl-[4.75rem]">
                          {refundedNow > 0 ? <p className="text-brand-primary">{formatCurrency(refundedNow)} refunded to your original payment method (usually 5–7 working days).</p> : null}
                          {refundInProgress ? <p className="text-brand-dark/70">A refund is being processed.</p> : null}
                          {openRequest ? (
                            <p className="flex flex-wrap items-center gap-2 text-brand-dark/80">
                              <span>
                                {openRequest.status === "requested"
                                  ? "Return requested — we're reviewing it"
                                  : returnPickup
                                    ? `Return approved — a courier${returnPickup.courier_name ? ` from ${returnPickup.courier_name}` : ""} is collecting it (AWB ${returnPickup.awb_number})`
                                    : "Return approved — we'll arrange the pickup"}
                                {" "}({RETURN_REASONS[openRequest.reason as ReturnReason] ?? openRequest.reason}).
                              </span>
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
                          {canReview && item.product_id ? (
                            <WriteReviewButton productId={item.product_id} orderItemId={item.id} productName={item.product_name} hasReview={hasReview} />
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
          <section className="rounded-card border border-brand-dark/10 bg-brand-surface shadow-card p-4 text-sm">
            <h2 className="font-heading text-base text-brand-dark">Deliver to</h2>
            <p className="mt-2 font-medium text-brand-dark">{address.recipient_name}</p>
            <p className="text-brand-dark/70">{[address.address_line1, address.address_line2, address.landmark].filter(Boolean).join(", ")}</p>
            <p className="text-brand-dark/70">
              {address.city}, {address.state} — {address.pincode}
            </p>
            <p className="text-brand-dark/60">Mobile: {address.phone}</p>
            {order.gift_message ? <p className="mt-3 text-xs italic text-brand-dark/60">Gift message: “{order.gift_message}”</p> : null}
          </section>

          <section className="rounded-card border border-brand-dark/10 bg-brand-surface shadow-card p-4 text-sm">
            <h2 className="font-heading text-base text-brand-dark">Summary</h2>
            <dl className="mt-3 space-y-2">
              <SummaryRow label="Subtotal" value={formatCurrency(Number(order.subtotal))} />
              {Number(order.discount_amount) > 0 ? (
                <SummaryRow label={`Coupon ${order.coupon_code ?? ""}`.trim()} value={`− ${formatCurrency(Number(order.discount_amount))}`} />
              ) : null}
              <SummaryRow label="Delivery" value={Number(order.delivery_charge) === 0 ? "Free" : formatCurrency(Number(order.delivery_charge))} />
              {order.gift_wrap_selected ? <SummaryRow label={`Gift wrapping${wrapStyleLabel(order.gift_wrap_style) ? ` · ${wrapStyleLabel(order.gift_wrap_style)}` : ""}`} value={formatCurrency(Number(order.gift_wrap_charge))} /> : null}
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

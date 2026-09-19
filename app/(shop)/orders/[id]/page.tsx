import { notFound } from "next/navigation";
import { z } from "zod";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { PayNowButton } from "@/components/shop/PayNowButton";
import { isRazorpayConfigured } from "@/lib/integrations/razorpay";
import { ProductImage } from "@/components/shop/ProductImage";
import { Badge } from "@/components/ui/Badge";
import { getServerUser } from "@/lib/auth/session";
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

      {["confirmed", "processing", "partially_shipped", "shipped", "partially_delivered", "delivered"].includes(order.status) ? (
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

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          {Array.from(byVendor.entries()).map(([vendorId, group]) => (
            <section key={vendorId} className="rounded-2xl border border-brand-dark/10 bg-white p-4">
              <h2 className="border-b border-brand-dark/10 pb-2 font-heading text-sm text-brand-dark">{group.name}</h2>
              <ul className="divide-y divide-brand-dark/10">
                {group.items.map((item) => {
                  const p = (item.personalization ?? {}) as Record<string, string>;
                  return (
                    <li key={item.id} className="flex gap-3 py-3 text-sm">
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

import { personalizationSummary } from "@/lib/commerce/personalization";
import { WRAP_STYLES, wrapStyleLabel } from "@/lib/commerce/wrap-styles";
import { Gift, Zap } from "lucide-react";
import { OrderFulfilment } from "@/components/vendor/OrderFulfilment";
import { Badge } from "@/components/ui/Badge";
import { getVendorOrders, requireApprovedVendor } from "@/lib/db/vendor-portal";
import { isShiprocketConfigured } from "@/lib/integrations/shiprocket";
import { defaultWeightGrams } from "@/lib/vendor/dispatch";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Orders — GiftPing Vendor" };

export default async function VendorOrdersPage() {
  const { vendor } = await requireApprovedVendor();
  const orders = await getVendorOrders(vendor.id);
  const courierEnabled = isShiprocketConfigured();

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Orders</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Paid orders containing your products. Accept an order, pack it, then book a courier — the customer is kept
        up to date automatically.
      </p>

      {orders.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
          No orders yet.
        </p>
      ) : (
        <ul className="mt-6 space-y-5">
          {orders.map((order) => {
            const a = order.address;
            return (
              <li key={order.orderId} className="space-y-4 rounded-2xl border border-brand-dark/10 bg-brand-surface p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-heading text-lg text-brand-dark">{order.orderNumber}</p>
                    {order.placedAt ? <p className="text-xs text-brand-dark/50">{new Date(order.placedAt).toLocaleString("en-IN")}</p> : null}
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-brand-dark/60">Your earnings</p>
                    <p className="font-medium text-brand-dark">{formatCurrency(order.payout)}</p>
                  </div>
                </div>

                {order.expressRequested ? (
                  <p className="flex items-center gap-1.5 rounded-xl bg-brand-secondary/15 px-3 py-2 text-xs font-semibold text-brand-secondary-dark">
                    <Zap className="h-3.5 w-3.5" /> Customer paid for Express delivery — please accept and dispatch promptly.
                  </p>
                ) : null}

                <ul className="divide-y divide-brand-dark/10 text-sm">
                  {order.items.map((item) => {
                    const p = (item.personalization ?? {}) as Record<string, string>;
                    return (
                      <li key={item.id} className="flex items-start justify-between gap-3 py-2">
                        <div>
                          <p className="font-medium text-brand-dark">
                            {item.product_name} × {item.quantity}
                          </p>
                          {item.variant_label ? <p className="text-xs text-brand-dark/60">{item.variant_label}</p> : null}
                          {/* The text to engrave/print must be carried out EXACTLY, so it gets its own prominent line rather than hiding in the summary. */}
                          {p.engraving ? <p className="mt-1 inline-block rounded-md bg-brand-secondary/15 px-2 py-0.5 text-sm font-semibold text-brand-secondary-dark">Engrave: “{p.engraving}”</p> : null}
                          {personalizationSummary({ ...p, engraving: undefined }) ? <p className="text-xs text-brand-dark/60">{personalizationSummary({ ...p, engraving: undefined })}</p> : null}
                        </div>
                        <Badge>{item.fulfilment_status}</Badge>
                      </li>
                    );
                  })}
                </ul>

                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-brand-dark/50">Ship to</p>
                    <p className="font-medium text-brand-dark">{a.recipient_name}</p>
                    <p className="text-brand-dark/70">{[a.address_line1, a.address_line2, a.landmark].filter(Boolean).join(", ")}</p>
                    <p className="text-brand-dark/70">{a.city}, {a.state} — {a.pincode}</p>
                    <p className="text-brand-dark/60">Mobile: {a.phone}</p>
                  </div>
                  {order.giftWrap || order.giftMessage ? (
                    <div className="rounded-xl bg-brand-accent/60 p-3">
                      <p className="flex items-center gap-1 text-xs uppercase tracking-wide text-brand-secondary-dark">
                        <Gift className="h-3 w-3" /> Gift
                      </p>
                      {order.giftWrap ? <p className="text-brand-dark">Gift-wrap this parcel{wrapStyleLabel(order.giftWrapStyle) ? ` in ${wrapStyleLabel(order.giftWrapStyle)} (${WRAP_STYLES.find((w) => w.id === order.giftWrapStyle)?.detail?.toLowerCase()})` : ""}.</p> : null}
                      {order.giftMessage ? <p className="italic text-brand-dark/80">Card: “{order.giftMessage}”</p> : null}
                    </div>
                  ) : null}
                </div>

                <OrderFulfilment order={order} defaultWeightGrams={defaultWeightGrams(order.weightItems)} courierEnabled={courierEnabled} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

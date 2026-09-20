import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import { CancelOrderButton } from "@/components/admin/CancelOrderButton";
import { Badge } from "@/components/ui/Badge";
import { getAdminOrder } from "@/lib/db/admin-orders";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Order — GiftPing Admin" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const customer = one(order.customer);
  const addr = (order.delivery_address ?? {}) as Record<string, string | null>;
  const capturedPayment = order.payments.find((p) => p.status === "captured");
  const paid = ["confirmed", "processing"].includes(order.status);
  const cancelled = ["cancelled", "refunded"].includes(order.status);
  const cancellable = ["created", "payment_initiated", "confirmed", "processing"].includes(order.status);
  const commission = order.items.reduce((s, i) => s + Number(one(i.financials)?.commission_amount ?? 0), 0);

  return (
    <div className="space-y-6">
      <Link href="/admin/orders" className="inline-flex items-center gap-1 text-sm text-brand-dark/60 hover:underline"><ArrowLeft className="h-4 w-4" /> Orders</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">{order.order_number}</h1>
          <p className="text-sm text-brand-dark/60">{customer?.full_name} · {customer?.email} · {new Date(order.placed_at ?? order.created_at).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={cancelled ? "neutral" : "primary"}>{order.status.replace(/_/g, " ")}</Badge>
          {(cancellable || (cancelled && capturedPayment)) ? (
            <CancelOrderButton orderId={order.id} orderNumber={order.order_number} paid={paid || Boolean(capturedPayment)} alreadyCancelled={cancelled} refundPending={cancelled && Boolean(capturedPayment)} />
          ) : null}
        </div>
      </div>

      {cancelled && capturedPayment ? (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">This order is cancelled but its payment is still captured — the refund didn&apos;t complete{capturedPayment.failure_reason ? ` (${capturedPayment.failure_reason})` : ""}. Use “Retry refund”.</p>
      ) : null}
      {order.notes ? <p className="text-sm text-brand-dark/70"><span className="text-brand-dark/50">Note: </span>{order.notes}</p> : null}

      <section className="rounded-2xl border border-brand-dark/10 bg-white p-4">
        <h2 className="font-heading text-lg text-brand-dark">Items</h2>
        <ul className="mt-2 divide-y divide-brand-dark/10 text-sm">
          {order.items.map((i) => {
            const fin = one(i.financials);
            return (
              <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <p className="font-medium text-brand-dark">{i.product_name} × {i.quantity}</p>
                  <p className="text-xs text-brand-dark/60">{one(i.vendor)?.business_name}{i.variant_label ? ` · ${i.variant_label}` : ""} · {i.fulfilment_status}</p>
                </div>
                <div className="text-right">
                  <p>{formatCurrency(Number(i.total_price) - Number(i.discount_amount))}</p>
                  {fin ? <p className="text-xs text-brand-dark/50">commission {formatCurrency(Number(fin.commission_amount))} ({Number(fin.commission_rate)}%) · vendor {formatCurrency(Number(fin.vendor_payout))}</p> : null}
                </div>
              </li>
            );
          })}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-brand-dark/10 pt-3 text-sm">
          {[["Subtotal", order.subtotal], ["Discount" + (order.coupon_code ? ` (${order.coupon_code})` : ""), -Number(order.discount_amount)], ["Delivery", order.delivery_charge], ["Gift wrap", order.gift_wrap_charge]].map(([l, v]) => Number(v) !== 0 ? (
            <div key={String(l)} className="flex justify-between"><dt className="text-brand-dark/60">{l}</dt><dd>{formatCurrency(Number(v))}</dd></div>
          ) : null)}
          <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatCurrency(Number(order.total_amount))}</dd></div>
          <div className="flex justify-between text-brand-dark/50"><dt>Includes GST</dt><dd>{formatCurrency(Number(order.gst_amount))}</dd></div>
          <div className="flex justify-between text-brand-dark/50"><dt>Platform commission</dt><dd>{formatCurrency(commission)}</dd></div>
        </dl>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
          <h2 className="font-heading text-lg text-brand-dark">Delivery</h2>
          <p className="mt-2 font-medium">{addr.recipient_name}</p>
          <p className="text-brand-dark/70">{[addr.address_line1, addr.address_line2, addr.landmark].filter(Boolean).join(", ")}</p>
          <p className="text-brand-dark/70">{addr.city}, {addr.state} — {addr.pincode}</p>
          <p className="text-brand-dark/60">Mobile: {addr.phone}</p>
          {order.gift_message ? <p className="mt-2 italic text-brand-dark/70">Card: “{order.gift_message}”</p> : null}
        </section>
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
          <h2 className="font-heading text-lg text-brand-dark">Payments</h2>
          {order.payments.length === 0 ? <p className="mt-2 text-brand-dark/50">No payment attempt.</p> : (
            <ul className="mt-2 space-y-2">
              {order.payments.map((p) => (
                <li key={p.id}>
                  <p><Badge variant={p.status === "captured" ? "primary" : "neutral"}>{p.status}</Badge> <span className="ml-1">{formatCurrency(Number(p.amount))}{p.payment_method ? ` · ${p.payment_method}` : ""}</span></p>
                  <p className="text-xs text-brand-dark/50">{p.razorpay_payment_id ?? "—"}{p.refund_id ? ` · refund ${p.refund_id}` : ""}</p>
                  {p.failure_reason ? <p className="text-xs text-red-700">{p.failure_reason}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {order.shipments.filter((s) => !s.is_return).length > 0 ? (
        <section className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
          <h2 className="font-heading text-lg text-brand-dark">Shipments</h2>
          <ul className="mt-2 space-y-3">
            {order.shipments.filter((s) => !s.is_return).map((s) => (
              <li key={s.id}>
                <p><span className="font-medium">{one(s.vendor)?.business_name}</span> · <Badge>{s.status.replace(/_/g, " ")}</Badge> {s.courier_name ?? ""} {s.awb_number ? `· AWB ${s.awb_number}` : ""}</p>
                {[...(s.events ?? [])].sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at)).slice(0, 4).map((e) => (
                  <p key={e.id} className="ml-3 text-xs text-brand-dark/60">{new Date(e.occurred_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} — {e.activity ?? e.raw_status}{e.location ? `, ${e.location}` : ""}</p>
                ))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

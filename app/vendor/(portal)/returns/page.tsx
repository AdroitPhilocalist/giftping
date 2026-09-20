import { Badge } from "@/components/ui/Badge";
import { RETURN_REASONS, type ReturnReason } from "@/lib/commerce/refunds";
import { createClient } from "@/lib/db/server";
import { requireApprovedVendor } from "@/lib/db/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Returns — GiftPing Vendor" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export default async function VendorReturnsPage() {
  const { vendor } = await requireApprovedVendor();
  const supabase = await createClient(); // the vendor's own session: RLS only returns returns and refunds on THEIR products
  const [{ data: requests }, { data: refunds }] = await Promise.all([
    supabase
      .from("return_requests")
      .select("id, status, quantity, reason, details, created_at, decision_note, order:orders ( order_number ), item:order_items ( product_name )")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("refunds")
      .select("id, amount, status, reason, processed_at, created_at, order:orders ( order_number ), item:order_items!inner ( product_name, vendor_id )")
      .eq("status", "processed")
      .eq("item.vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Returns &amp; refunds</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          GiftPing reviews return requests and handles the customer. You don&apos;t need to do anything here — it&apos;s so you can see what was requested and how it affects your earnings.
          When a refund is issued, your earnings on that item shrink in the same proportion (and, if the item was already paid out, the difference comes off your next payout).
        </p>
      </div>

      <section>
        <h2 className="font-heading text-xl text-brand-dark">Return requests</h2>
        {(requests ?? []).length === 0 ? <p className="mt-3 text-sm text-brand-dark/50">None so far.</p> : (
          <ul className="mt-3 space-y-3">
            {(requests ?? []).map((r) => (
              <li key={r.id} className="rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
                <p className="font-medium text-brand-dark">{one(r.order)?.order_number} · {one(r.item)?.product_name} × {r.quantity} <Badge variant={r.status === "requested" ? "gold" : r.status === "approved" || r.status === "refunded" ? "primary" : "neutral"}>{r.status}</Badge></p>
                <p className="text-xs text-brand-dark/60">{RETURN_REASONS[r.reason as ReturnReason] ?? r.reason} · {new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                {r.details ? <p className="mt-1 text-brand-dark/80">“{r.details}”</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-heading text-xl text-brand-dark">Refunds on your items</h2>
        {(refunds ?? []).length === 0 ? <p className="mt-3 text-sm text-brand-dark/50">None so far.</p> : (
          <ul className="mt-3 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white text-sm">
            {(refunds ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{one(r.order)?.order_number} · {one(r.item)?.product_name}</span>
                <span className="text-brand-dark/70">{formatCurrency(Number(r.amount))} refunded · {r.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

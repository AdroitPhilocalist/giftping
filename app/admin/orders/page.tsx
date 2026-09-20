import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUSES, listAdminOrders } from "@/lib/db/admin-orders";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Orders — GiftPing Admin" };

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const { orders, total, pageSize } = await listAdminOrders({ status: sp.status, q: sp.q, page });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (over: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { status: sp.status, q: sp.q, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const s = p.toString();
    return `/admin/orders${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Orders</h1>
      <p className="mt-1 text-sm text-brand-dark/60">{total} {total === 1 ? "order" : "orders"}{sp.status ? ` · ${sp.status.replace(/_/g, " ")}` : ""}</p>

      <form method="get" className="mt-5 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Order number, e.g. GP-100028" className="w-64 rounded-xl border border-brand-dark/15 bg-white px-4 py-2 text-sm" aria-label="Search by order number" />
        <select name="status" defaultValue={sp.status ?? ""} className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2 text-sm" aria-label="Filter by status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <button className="rounded-xl bg-brand-primary px-4 py-2 text-sm text-brand-light">Filter</button>
      </form>

      {orders.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No orders match.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white">
          {orders.map((o) => {
            const customer = Array.isArray(o.customer) ? o.customer[0] : o.customer;
            return (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-brand-accent/40">
                  <div>
                    <p className="font-medium text-brand-dark">{o.order_number}</p>
                    <p className="text-xs text-brand-dark/60">{customer?.full_name ?? "—"} · {new Date(o.placed_at ?? o.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}{o.coupon_code ? ` · ${o.coupon_code}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-brand-dark">{formatCurrency(Number(o.total_amount))}</span>
                    <Badge variant={["cancelled", "refunded"].includes(o.status) ? "neutral" : ["created", "payment_initiated"].includes(o.status) ? "gold" : "primary"}>{o.status.replace(/_/g, " ")}</Badge>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={link({ page: String(page - 1) })} className="text-brand-primary underline">← Newer</Link> : <span />}
          <span className="text-brand-dark/50">Page {page} of {pages}</span>
          {page < pages ? <Link href={link({ page: String(page + 1) })} className="text-brand-primary underline">Older →</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}

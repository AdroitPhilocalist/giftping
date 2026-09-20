import Link from "next/link";
import { DecideReturnButtons, RetryRefundButton } from "@/components/admin/ReturnRefundControls";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { RETURN_REASONS, type ReturnReason } from "@/lib/commerce/refunds";
import { RETURN_STATUSES, listReturnRequests, listUnfinishedRefunds } from "@/lib/db/admin-returns";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Returns — GiftPing Admin" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export default async function AdminReturnsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireRole("admin");
  const { status } = await searchParams;
  const active = status && (RETURN_STATUSES as readonly string[]).includes(status) ? status : "requested";
  const [requests, unfinished] = await Promise.all([listReturnRequests(active), listUnfinishedRefunds()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Returns</h1>
        <p className="mt-1 text-sm text-brand-dark/60">Customers can ask to return a delivered item within the return window. Approve or reject here, then refund from the order once the item is back.</p>
      </div>

      {unfinished.length > 0 ? (
        <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
          <h2 className="font-heading text-lg text-red-900">Refunds that didn&apos;t finish</h2>
          <ul className="mt-2 divide-y divide-red-200">
            {unfinished.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-red-900"><Link href={`/admin/orders/${r.order_id}`} className="font-medium underline">{one(r.order)?.order_number}</Link> · {one(r.item)?.product_name} · {formatCurrency(Number(r.amount))} · {r.status}</p>
                  {r.failure_reason ? <p className="text-xs text-red-800">{r.failure_reason}</p> : null}
                </div>
                <RetryRefundButton refundId={r.id} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
        {RETURN_STATUSES.map((s) => (
          <Link key={s} href={`/admin/returns?status=${s}`} className={`rounded-full border px-3 py-1 text-xs ${s === active ? "border-brand-primary bg-brand-primary text-white" : "border-brand-dark/15 text-brand-dark hover:bg-brand-accent"}`}>{s}</Link>
        ))}
      </nav>

      {requests.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-dark/15 p-10 text-center text-sm text-brand-dark/50">Nothing {active}.</p>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 text-sm">
              <div>
                <p className="font-medium text-brand-dark">
                  <Link href={`/admin/orders/${r.order_id}`} className="underline">{one(r.order)?.order_number}</Link> · {one(r.item)?.product_name} × {r.quantity}{" "}
                  <Badge variant={r.status === "requested" ? "gold" : r.status === "approved" || r.status === "refunded" ? "primary" : "neutral"}>{r.status}</Badge>
                </p>
                <p className="text-xs text-brand-dark/60">{one(r.customer)?.full_name} · {one(r.vendor)?.business_name} · {RETURN_REASONS[r.reason as ReturnReason] ?? r.reason} · {new Date(r.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
                {r.details ? <p className="mt-1 text-brand-dark/80">“{r.details}”</p> : null}
              </div>
              {r.status === "requested" ? <DecideReturnButtons returnId={r.id} productName={one(r.item)?.product_name ?? "this item"} />
                : r.status === "approved" ? <Link href={`/admin/orders/${r.order_id}`} className="text-xs text-brand-primary underline">Issue the refund →</Link> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

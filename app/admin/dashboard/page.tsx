import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAdminDashboard } from "@/lib/db/admin-stats";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Dashboard — GiftPing Admin" };

const RANGES = [7, 30, 90] as const;

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireRole("admin");
  const sp = await searchParams;
  const days = (RANGES as readonly number[]).includes(Number(sp.range)) ? (Number(sp.range) as 7 | 30 | 90) : 30;
  const d = await getAdminDashboard(days);
  const { stats } = d;
  const peak = Math.max(1, ...stats.daily.map((x) => x.gmv));

  const attention = [
    d.waitingOnSuspended.length > 0 && { tone: "red", text: `${d.waitingOnSuspended.length} paid ${d.waitingOnSuspended.length === 1 ? "order is" : "orders are"} stuck with a suspended boutique — nobody is shipping ${d.waitingOnSuspended.length === 1 ? "it" : "them"}`, href: `/admin/orders/${d.waitingOnSuspended[0].orderId}`, cta: "Look after now" },
    d.stuckRefunds.length > 0 && { tone: "red", text: `${d.stuckRefunds.length} cancelled ${d.stuckRefunds.length === 1 ? "order has" : "orders have"} a payment that was never refunded`, href: `/admin/orders/${d.stuckRefunds[0].id}`, cta: "Fix now" },
    d.unfinishedRefunds > 0 && { tone: "red", text: `${d.unfinishedRefunds} ${d.unfinishedRefunds === 1 ? "refund hasn't" : "refunds haven't"} gone through`, href: "/admin/returns", cta: "Fix now" },
    d.pendingReturns > 0 && { tone: "gold", text: `${d.pendingReturns} return ${d.pendingReturns === 1 ? "request" : "requests"} waiting`, href: "/admin/returns", cta: "Review" },
    d.pendingVendors > 0 && { tone: "gold", text: `${d.pendingVendors} vendor ${d.pendingVendors === 1 ? "application" : "applications"} waiting`, href: "/admin/vendors", cta: "Review" },
    d.pendingProducts > 0 && { tone: "gold", text: `${d.pendingProducts} ${d.pendingProducts === 1 ? "product" : "products"} awaiting approval`, href: "/admin/products", cta: "Review" },
    d.staleUnpaid > 0 && { tone: "gold", text: `${d.staleUnpaid} unpaid ${d.staleUnpaid === 1 ? "order is" : "orders are"} over 48 hours old (the daily job cancels them)`, href: "/admin/orders?status=created", cta: "View" },
  ].filter(Boolean) as { tone: string; text: string; href: string; cta: string }[];

  const tile = (label: string, value: string, sub?: string) => (
    <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
      <p className="text-xs uppercase tracking-wide text-brand-dark/50">{label}</p>
      <p className="mt-1 font-heading text-2xl text-brand-dark">{value}</p>
      {sub ? <p className="text-xs text-brand-dark/50">{sub}</p> : null}
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Dashboard</h1>
          <p className="mt-1 text-sm text-brand-dark/60">Signed in as {user.fullName}. Paid orders, last {days} days.</p>
        </div>
        <nav aria-label="Period" className="flex gap-1 rounded-full border border-brand-dark/10 bg-brand-surface p-1 text-sm">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/dashboard?range=${r}`} aria-current={r === days ? "page" : undefined} className={`rounded-full px-3 py-1 ${r === days ? "bg-brand-primary text-brand-light" : "text-brand-dark/70 hover:bg-brand-accent"}`}>{r}d</Link>
          ))}
        </nav>
      </div>

      {attention.length > 0 ? (
        <ul className="space-y-2" aria-label="Needs attention">
          {attention.map((a) => (
            <li key={a.text} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm ${a.tone === "red" ? "bg-red-50 text-red-900" : "bg-brand-accent/70 text-brand-dark"}`}>
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 shrink-0" />{a.text}</span>
              <Link href={a.href} className="font-medium underline">{a.cta}</Link>
            </li>
          ))}
        </ul>
      ) : null}

      {d.waitingOnSuspended.length > 0 ? (
        <section aria-labelledby="waiting-heading" className="rounded-2xl border border-red-200 bg-brand-surface p-4">
          <h2 id="waiting-heading" className="font-heading text-lg text-brand-dark">Paid orders waiting on a suspended boutique</h2>
          <p className="mt-1 text-sm text-brand-dark/60">The customer has paid, but the boutique was suspended before it shipped, so nobody will dispatch these. Either reinstate the boutique, or open the order and cancel &amp; refund it.</p>
          <ul className="mt-3 divide-y divide-brand-dark/10 text-sm">
            {d.waitingOnSuspended.slice(0, 10).map((w) => (
              <li key={`${w.orderId}:${w.vendorId}`} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span><strong className="text-brand-dark">{w.orderNumber}</strong> · {w.vendorName} · {w.itemCount} {w.itemCount === 1 ? "item" : "items"}{w.placedAt ? ` · paid ${new Date(w.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}</span>
                <span className="flex gap-4"><Link href={`/admin/orders/${w.orderId}`} className="text-brand-primary underline">Open order</Link><Link href="/admin/vendors" className="text-brand-dark/60 underline">Vendors</Link></span>
              </li>
            ))}
            {d.waitingOnSuspended.length > 10 ? <li className="py-2 text-brand-dark/50">…and {d.waitingOnSuspended.length - 10} more</li> : null}
          </ul>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tile("Sales (GMV)", formatCurrency(stats.gmv), `${stats.orders} ${stats.orders === 1 ? "order" : "orders"} · ${stats.unitsSold} units`)}
        {tile("Avg order value", formatCurrency(stats.aov))}
        {tile("Platform commission", formatCurrency(stats.commission), "earned on those orders")}
        {tile("Refunded", formatCurrency(d.refundedAmount), `${d.refundedCount} ${d.refundedCount === 1 ? "refund" : "refunds"}`)}
      </div>
      {d.truncated ? <p className="text-xs text-brand-dark/50">Showing the latest 2,000 orders in this period — totals are a lower bound.</p> : null}

      <section aria-labelledby="daily-heading" className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
        <h2 id="daily-heading" className="font-heading text-lg text-brand-dark">Sales by day</h2>
        <div className="mt-3 flex h-32 items-end gap-px" role="img" aria-label={`Daily sales for the last ${days} days`}>
          {stats.daily.map((x) => (
            <div key={x.date} title={`${x.date}: ${formatCurrency(x.gmv)} (${x.orders} orders)`} className="flex-1 rounded-t bg-brand-secondary/70 transition-colors hover:bg-brand-secondary-dark" style={{ height: `${Math.max(x.gmv > 0 ? 4 : 1, (x.gmv / peak) * 100)}%` }} />
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-brand-dark/40"><span>{stats.daily[0]?.date}</span><span>{stats.daily.at(-1)?.date}</span></div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {([["Top products", stats.topProducts], ["Top boutiques", stats.topVendors]] as const).map(([title, list]) => (
          <section key={title} className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
            <h2 className="font-heading text-lg text-brand-dark">{title}</h2>
            {list.length === 0 ? <p className="mt-2 text-sm text-brand-dark/50">No sales in this period.</p> : (
              <ol className="mt-2 space-y-1.5 text-sm">
                {list.map((x, i) => (
                  <li key={x.id} className="flex justify-between gap-3"><span className="truncate"><span className="text-brand-dark/40">{i + 1}.</span> {x.name}</span><span className="shrink-0 text-brand-dark/70">{formatCurrency(x.revenue)} · {x.units}</span></li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
          <h2 className="font-heading text-lg text-brand-dark">Low stock</h2>
          {d.lowStock.length === 0 ? <p className="mt-2 text-sm text-brand-dark/50">Everything live has healthy stock.</p> : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {d.lowStock.map((p) => <li key={p.id} className="flex justify-between gap-3"><span className="truncate">{p.name} <span className="text-brand-dark/40">· {p.vendor}</span></span><span className={p.stock === 0 ? "font-medium text-red-700" : "text-brand-secondary-dark"}>{p.stock === 0 ? "Out" : `${p.stock} left`}</span></li>)}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
          <h2 className="font-heading text-lg text-brand-dark">Customers</h2>
          <p className="mt-2 font-heading text-2xl text-brand-dark">{d.newCustomers}</p>
          <p className="text-sm text-brand-dark/60">new sign-ups in the last {days} days</p>
        </section>
      </div>
    </div>
  );
}

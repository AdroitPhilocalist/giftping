import Link from "next/link";
import { ChevronRight, PackageOpen } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { ProductImage } from "@/components/shop/ProductImage";
import { Pagination } from "@/components/shop/Pagination";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getServerUser } from "@/lib/auth/session";
import { listMyOrders } from "@/lib/db/orders";
import { describeOrderProgress, ORDER_STEPS } from "@/lib/shop/order-progress";
import { formatCurrency } from "@/lib/utils/format";
import { ORDER_STATUS_LABEL } from "@/lib/shop/order-labels";

export const metadata = { title: "My Orders — GiftPing" };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const user = await getServerUser();
  if (!user) return null; // proxy.ts redirects signed-out visitors before this renders
  const page = Math.max(1, Number((await searchParams).page ?? "1") || 1);
  const { orders, total, totalPages } = await listMyOrders(user.id, page);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">
        <Link href="/account" className="hover:underline">My account</Link> <span aria-hidden="true">›</span> Orders
      </p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark">
        My <span className="accent-word">Orders</span>
        {total > 0 ? <span className="ml-3 align-middle font-sans text-base text-brand-dark/50">{total}</span> : null}
      </h1>

      {orders.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-brand-secondary/20 bg-gradient-to-b from-brand-accent/60 to-brand-surface p-10 text-center shadow-card sm:p-14">
          <Robin pose="perched" priority className="w-32" />
          <h2 className="font-heading text-2xl text-brand-dark">No orders yet</h2>
          <p className="max-w-sm text-brand-dark/65">When you place an order it will appear here, with a live progress bar for every parcel.</p>
          <Button size="lg" className="mt-2" asChild><Link href="/mall"><PackageOpen className="h-4 w-4" /> Explore the Mall</Link></Button>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((order) => {
            const progress = describeOrderProgress(order.status);
            const units = order.items.reduce((n, i) => n + i.quantity, 0);
            const step = progress.completed === null ? null : Math.min(progress.completed, ORDER_STEPS.length - 1);
            const badgeVariant = (() => {
              if (progress.tone === "waiting") return "waiting";
              if (progress.tone === "cancelled") return "cancelled";
              if (progress.tone === "done") return "done";
              if (progress.completed === 3) return "shipped";
              return "progress";
            })();
            return (
              <li key={order.id}>
                <Link href={`/orders/${order.id}`} className="group block rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg text-brand-dark">{order.order_number}</p>
                      <p className="text-xs text-brand-dark/55">Placed {new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · {units} {units === 1 ? "item" : "items"}</p>
                    </div>
                    <Badge variant={badgeVariant}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex -space-x-3">
                      {order.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="h-14 w-14 overflow-hidden rounded-button border-2 border-brand-surface bg-brand-accent shadow-sm">
                          <ProductImage src={item.product_image} alt={item.product_name} className="h-full w-full" sizes="56px" />
                        </div>
                      ))}
                      {order.items.length > 4 ? <span className="flex h-14 w-14 items-center justify-center rounded-button border-2 border-brand-surface bg-brand-accent text-xs text-brand-dark/70">+{order.items.length - 4}</span> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-dark">{order.items.map((i) => i.product_name).join(", ")}</p>
                      <p className="text-xs text-brand-dark/60">{progress.headline}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-lg text-brand-dark">{formatCurrency(Number(order.total_amount))}</p>
                      <p className="flex items-center justify-end text-xs font-medium text-brand-secondary-dark">Track <ChevronRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" /></p>
                    </div>
                  </div>

                  {step !== null ? (
                    <div className="mt-4" aria-label={`Progress: ${step >= ORDER_STEPS.length ? "delivered" : ORDER_STEPS[step]}`}>
                      <div className="flex gap-1.5">
                        {ORDER_STEPS.map((label, i) => (
                          <span key={label} className={`h-1.5 flex-1 rounded-full ${i < (progress.completed ?? 0) ? "bg-brand-secondary" : i === progress.completed ? "bg-brand-secondary/40" : "bg-brand-dark/10"}`} />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/orders${p > 1 ? `?page=${p}` : ""}`} />
    </div>
  );
}

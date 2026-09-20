import Link from "next/link";
import { CreateSettlementButton } from "@/components/admin/SettlementControls";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Payouts — GiftPing Admin" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export default async function AdminSettlementsPage() {
  await requireRole("admin"); // the payout functions are service-role only, called here AFTER the admin check
  const [{ data: overview }, { data: settlements }, { data: hold }] = await Promise.all([
    createAdminClient().rpc("payout_overview"),
    (await createClient()).from("vendor_settlements").select("id, amount, status, item_count, created_at, settled_at, payment_reference, vendor:vendors ( business_name )").order("created_at", { ascending: false }).limit(30),
    createAdminClient().from("platform_settings").select("value").eq("key", "payout_hold_days").maybeSingle(),
  ]);
  const holdDays = Number(hold?.value ?? 7);
  const rows = overview ?? [];
  // what a settlement would actually pay = payable lines minus refund deductions still waiting to be netted off
const netFor = (r: { payable: number; open_adjustments: number }) => Number(r.payable) + Number(r.open_adjustments);
  const totalPayable = rows.reduce((s, r) => s + Math.max(0, netFor(r)), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Vendor payouts</h1>
        <p className="mt-1 text-sm text-brand-dark/60">
          A delivered line becomes payable {holdDays} days after delivery (the returns window). Create a settlement, pay it by bank transfer, then record the reference —
          each line can be settled exactly once. <span className="text-brand-dark/80">Total payable now: <strong>{formatCurrency(totalPayable)}</strong></span>
        </p>
      </div>

      <section aria-labelledby="ov-heading">
        <h2 id="ov-heading" className="sr-only">Per vendor</h2>
        {rows.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-dark/15 p-10 text-center text-sm text-brand-dark/50">No partner vendors yet.</p>
        ) : (
          <ul className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
            {rows.map((r) => (
              <li key={r.vendor_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-brand-dark">{r.business_name} {r.status === "suspended" ? <Badge variant="gold">suspended</Badge> : null}</p>
                  <p className="text-xs text-brand-dark/60">In hold {formatCurrency(Number(r.in_hold))} · paid so far {formatCurrency(Number(r.settled))}{r.open_settlements > 0 ? ` · ${r.open_settlements} awaiting payment` : ""}{Number(r.open_adjustments) < 0 ? ` · ${formatCurrency(-Number(r.open_adjustments))} of refunds to deduct` : ""}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right"><p className="font-heading text-lg text-brand-dark">{formatCurrency(Math.max(0, netFor(r)))}</p><p className="text-xs text-brand-dark/50">payable · {r.payable_items} {r.payable_items === 1 ? "line" : "lines"}</p></div>
                  <CreateSettlementButton vendorId={r.vendor_id} name={r.business_name} amountLabel={formatCurrency(Math.max(0, netFor(r)))} disabled={netFor(r) <= 0} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="hist-heading">
        <h2 id="hist-heading" className="font-heading text-xl text-brand-dark">Settlements</h2>
        {(settlements ?? []).length === 0 ? <p className="mt-3 text-sm text-brand-dark/50">None yet.</p> : (
          <ul className="mt-3 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
            {(settlements ?? []).map((s) => (
              <li key={s.id}>
                <Link href={`/admin/settlements/${s.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-brand-accent/40">
                  <div>
                    <p className="font-medium text-brand-dark">{one(s.vendor)?.business_name}</p>
                    <p className="text-xs text-brand-dark/60">{new Date(s.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })} · {s.item_count} lines{s.payment_reference ? ` · ref ${s.payment_reference}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm"><span>{formatCurrency(Number(s.amount))}</span><Badge variant={s.status === "settled" ? "primary" : s.status === "failed" ? "neutral" : "gold"}>{s.status === "failed" ? "voided" : s.status}</Badge></div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

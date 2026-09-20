import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { requireApprovedVendor } from "@/lib/db/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Payouts — GiftPing Vendor" };

export default async function VendorPayoutsPage() {
  const { vendor } = await requireApprovedVendor();
  const d = Array.isArray(vendor.details) ? vendor.details[0] : vendor.details;

  // The vendor id comes from the signed-in session (never the request). The payout functions are service-role only, so this read uses the admin client scoped to that id.
  const [{ data: lines }, { data: settlements }, { data: hold }] = await Promise.all([
    createAdminClient().rpc("settlement_items_all", { p_vendor_id: vendor.id }),
    (await createClient()).from("vendor_settlements").select("id, amount, status, item_count, created_at, settled_at, payment_reference").eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(30),
    createAdminClient().from("platform_settings").select("value").eq("key", "payout_hold_days").maybeSingle(),
  ]);
  const all = lines ?? [];
  const payable = all.filter((l) => l.is_due).reduce((s, l) => s + Number(l.payout), 0);
  const upcoming = all.filter((l) => !l.is_due).sort((a, b) => +new Date(a.due_at) - +new Date(b.due_at));
  const inHold = upcoming.reduce((s, l) => s + Number(l.payout), 0);
  const paid = (settlements ?? []).filter((s) => s.status === "settled").reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">Payouts</h1>
        <p className="mt-1 text-sm text-brand-dark/60">Earnings become payable {Number(hold?.value ?? 7)} days after delivery. GiftPing pays them to {d?.bank_account_name ?? "your bank account"} (••••{d?.bank_account_last4 ?? "----"}).</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[["Payable now", payable], ["Waiting for the hold period", inHold], ["Paid so far", paid]].map(([label, value]) => (
          <div key={label as string} className="rounded-2xl border border-brand-dark/10 bg-white p-4"><p className="text-xs uppercase tracking-wide text-brand-dark/50">{label as string}</p><p className="mt-1 font-heading text-2xl text-brand-dark">{formatCurrency(value as number)}</p></div>
        ))}
      </div>

      <section>
        <h2 className="font-heading text-xl text-brand-dark">Settlements</h2>
        {(settlements ?? []).length === 0 ? <p className="mt-3 text-sm text-brand-dark/50">No payouts yet.</p> : (
          <ul className="mt-3 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white">
            {(settlements ?? []).map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                <div><p className="font-medium text-brand-dark">{formatCurrency(Number(s.amount))} <span className="font-normal text-brand-dark/50">· {s.item_count} lines</span></p>
                  <p className="text-xs text-brand-dark/60">{new Date(s.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}{s.payment_reference ? ` · bank ref ${s.payment_reference}` : ""}</p></div>
                <div className="flex items-center gap-3">
                  <Badge variant={s.status === "settled" ? "primary" : s.status === "failed" ? "neutral" : "gold"}>{s.status === "settled" ? "paid" : s.status === "failed" ? "voided" : "being paid"}</Badge>
                  {s.status !== "failed" ? <a href={`/api/settlements/${s.id}/csv`} className="inline-flex items-center gap-1 text-xs text-brand-primary underline"><Download className="h-3 w-3" /> Statement</a> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 ? (
        <section>
          <h2 className="font-heading text-xl text-brand-dark">Coming up</h2>
          <ul className="mt-3 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-white text-sm">
            {upcoming.slice(0, 15).map((l) => (
              <li key={l.order_item_id} className="flex flex-wrap justify-between gap-2 p-3">
                <span>{l.order_number} · {l.product_name} × {l.quantity}</span>
                <span className="text-brand-dark/70">{formatCurrency(Number(l.payout))} · payable {new Date(l.due_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

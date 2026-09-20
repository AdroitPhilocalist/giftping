import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, Download } from "lucide-react";
import { SettlementActions } from "@/components/admin/SettlementControls";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Settlement — GiftPing Admin" };
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  await requireRole("admin");
  const supabase = await createClient();

  const { data: s } = await supabase.from("vendor_settlements").select("id, vendor_id, amount, status, item_count, created_at, settled_at, payment_reference, notes, vendor:vendors ( business_name )").eq("id", id).maybeSingle();
  if (!s) notFound();
  const { data: lines } = await supabase
    .from("order_item_financials")
    .select("commission_amount, vendor_payout, refunded_commission, refunded_payout, settled_payout, settled_commission, item:order_items ( product_name, quantity, total_price, discount_amount, refunded_amount, order:orders ( order_number ) )")
    .eq("settlement_id", id);
  const { data: adjustments } = await supabase.from("vendor_adjustments").select("id, reason, amount").eq("settlement_id", id).order("created_at");
  const { data: bank } = await supabase.from("vendor_private").select("bank_account_name, bank_account_last4, bank_ifsc").eq("vendor_id", s.vendor_id).maybeSingle();

  return (
    <div className="space-y-6">
      <Link href="/admin/settlements" className="inline-flex items-center gap-1 text-sm text-brand-dark/60 hover:underline"><ArrowLeft className="h-4 w-4" /> Payouts</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">{one(s.vendor)?.business_name}</h1>
          <p className="text-sm text-brand-dark/60">Created {new Date(s.created_at).toLocaleString("en-IN")} · {s.item_count} lines{s.settled_at ? ` · paid ${new Date(s.settled_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}` : ""}{s.payment_reference ? ` · ref ${s.payment_reference}` : ""}</p>
          {s.notes ? <p className="text-sm text-brand-dark/60">Note: {s.notes}</p> : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="font-heading text-2xl text-brand-dark">{formatCurrency(Number(s.amount))}</span>
          <Badge variant={s.status === "settled" ? "primary" : s.status === "failed" ? "neutral" : "gold"}>{s.status === "failed" ? "voided" : s.status}</Badge>
          <a href={`/api/settlements/${s.id}/csv`} className="inline-flex items-center gap-1 rounded-full border border-brand-dark/15 px-3 py-1.5 text-xs text-brand-dark hover:bg-brand-accent"><Download className="h-3.5 w-3.5" /> CSV</a>
        </div>
      </div>

      <p className="text-sm text-brand-dark/70">Pay to: <strong>{bank?.bank_account_name ?? "—"}</strong> · ••••{bank?.bank_account_last4 ?? "----"} · {bank?.bank_ifsc ?? "—"}</p>
      <SettlementActions settlementId={s.id} vendorId={s.vendor_id} status={s.status} />

      <section className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
        <h2 className="font-heading text-lg text-brand-dark">Lines</h2>
        {(lines ?? []).length === 0 ? <p className="mt-2 text-sm text-brand-dark/50">{s.status === "failed" ? "Voided — its lines returned to the payable pool." : "No lines."}</p> : (
          <ul className="mt-2 divide-y divide-brand-dark/10 text-sm">
            {(lines ?? []).map((l, i) => {
              const it = one(l.item);
              return (
                <li key={i} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>{one(it?.order)?.order_number} · {it?.product_name} × {it?.quantity}</span>
                  <span className="text-brand-dark/70">paid {formatCurrency(Number(it?.total_price) - Number(it?.discount_amount))} · commission {formatCurrency(Number(l.settled_commission ?? Number(l.commission_amount) - Number(l.refunded_commission)))} · <strong className="text-brand-dark">payout {formatCurrency(Number(l.settled_payout ?? Number(l.vendor_payout) - Number(l.refunded_payout)))}</strong></span>
                </li>
              );
            })}
          </ul>
        )}
        {(adjustments ?? []).length > 0 ? (
          <div className="mt-4 border-t border-brand-dark/10 pt-3">
            <h3 className="text-sm font-medium text-brand-dark">Refund deductions netted into this payout</h3>
            <ul className="mt-2 divide-y divide-brand-dark/10 text-sm">
              {(adjustments ?? []).map((a) => (
                <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{a.reason}</span><strong className="text-red-700">{formatCurrency(Number(a.amount))}</strong></li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

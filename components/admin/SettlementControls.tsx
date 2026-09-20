"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { createSettlementAction, markSettlementPaidAction, revealBankDetailsAction, voidSettlementAction } from "@/lib/admin/payout-actions";

export function CreateSettlementButton({ vendorId, name, amountLabel, disabled }: { vendorId: string; name: string; amountLabel: string; disabled: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button size="sm" disabled={disabled || pending} onClick={() => {
      if (!confirm(`Create a settlement of ${amountLabel} for ${name}? Their delivered lines are locked into it, and you then pay it by bank transfer.`)) return;
      startTransition(async () => {
        const r = await createSettlementAction(vendorId);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        toast.success("Settlement created — pay it, then record the bank reference.");
        router.push(`/admin/settlements/${r.settlementId}`);
      });
    }}>{pending ? "Creating…" : "Create settlement"}</Button>
  );
}

export function SettlementActions({ settlementId, vendorId, status }: { settlementId: string; vendorId: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState<{ accountName: string; accountNumber: string; ifsc: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const open = status === "pending" || status === "processing";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4 text-sm">
        <h2 className="flex items-center gap-2 font-heading text-lg text-brand-dark"><Landmark className="h-4 w-4 text-brand-secondary-dark" /> Vendor bank account</h2>
        {bank ? (
          <dl className="mt-2 space-y-1">
            <div><dt className="inline text-brand-dark/50">Account name: </dt><dd className="inline font-medium">{bank.accountName}</dd></div>
            <div><dt className="inline text-brand-dark/50">Account number: </dt><dd className="inline font-mono font-medium">{bank.accountNumber}</dd></div>
            <div><dt className="inline text-brand-dark/50">IFSC: </dt><dd className="inline font-mono font-medium">{bank.ifsc}</dd></div>
            <p className="pt-1 text-xs text-brand-dark/40">This reveal was recorded in the audit log.</p>
          </dl>
        ) : (
          <>
            <p className="mt-1 text-brand-dark/60">Stored encrypted. Revealing the full number is recorded in the audit log.</p>
            <Button size="sm" variant="secondary" className="mt-2" disabled={pending} onClick={() => startTransition(async () => { const r = await revealBankDetailsAction(vendorId); if (r.ok) setBank(r); else toast.error(r.error); })}>Reveal for transfer</Button>
          </>
        )}
      </div>

      {open ? (
        <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4 text-sm">
          <h2 className="font-heading text-lg text-brand-dark">Record the payment</h2>
          <p className="mt-1 text-brand-dark/60">After you&apos;ve transferred the money, enter the bank reference (UTR / transaction id). The vendor is emailed.</p>
          <form className="mt-3 flex flex-wrap items-center gap-2" onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const r = await markSettlementPaidAction(settlementId, reference);
              if (!r.ok) {
                setError(r.error ?? "Something went wrong.");
                return;
              }
              toast.success("Marked as paid.");
              router.refresh();
            });
          }}>
            <Input aria-label="Bank reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="UTR / transaction id" className="w-64" maxLength={100} />
            <Button type="submit" size="sm" disabled={pending}>Mark as paid</Button>
            <button type="button" disabled={pending} className="text-xs text-brand-dark/50 hover:text-red-700" onClick={() => {
              const note = prompt("Why are you voiding this settlement? Its lines become payable again.");
              if (note === null) return;
              startTransition(async () => { const r = await voidSettlementAction(settlementId, note); if (!r.ok) toast.error(r.error); else { toast.success("Settlement voided."); router.refresh(); } });
            }}>Void</button>
          </form>
          {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

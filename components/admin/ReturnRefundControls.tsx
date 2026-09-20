"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { decideReturnAction, issueRefundAction, retryRefundAction } from "@/lib/admin/refund-actions";
import { refundShare, refundableRemaining, suggestRefundAmount } from "@/lib/commerce/refunds";
import { formatCurrency } from "@/lib/utils/format";

/** Approve / reject a customer's return request. Rejecting needs a reason (the customer is told); approving can carry pickup instructions. */
export function DecideReturnButtons({ returnId, productName }: { returnId: string; productName: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await decideReturnAction({ returnId, approve: mode === "approve", note });
      if (!result.ok) return setError(result.error);
      toast.success(result.message);
      setMode(null);
      setNote("");
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setMode("approve")}>Approve</Button>
        <Button size="sm" variant="secondary" onClick={() => setMode("reject")}>Reject</Button>
      </div>
      <Modal
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        title={mode === "approve" ? `Approve the return of ${productName}?` : `Reject the return of ${productName}?`}
        description={mode === "approve" ? "The customer is told it was approved. Arrange the pickup with them, then issue the refund once the item is back." : "The customer is told the return wasn't approved, with your reason."}
      >
        <Label htmlFor="decide-note">{mode === "approve" ? "Instructions for the customer (optional)" : "Reason (the customer sees this)"}</Label>
        <Textarea id="decide-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={mode === "approve" ? "e.g. Our courier will call you within 2 days" : "e.g. The item shows signs of use"} />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMode(null)} disabled={pending}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending} className={mode === "reject" ? "bg-red-700 hover:bg-red-800" : undefined}>
            {pending ? "Saving…" : mode === "approve" ? "Approve return" : "Reject return"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export interface RefundLine {
  orderItemId: string;
  productName: string;
  quantity: number;
  /** total_price − discount_amount */
  paid: number;
  /** processed + pending refunds already on this line */
  alreadyRefunded: number;
  returnedQuantity: number;
  commission: number;
  payout: number;
  /** the line's already-recorded reductions, to preview the vendor impact cumulatively */
  approvedReturn?: { id: string; quantity: number } | null;
}

/** Refund part or all of a delivered line. The database enforces the caps; the form only suggests and previews. */
export function RefundLineButton({ line, label = "Refund…" }: { line: RefundLine; label?: string }) {
  const router = useRouter();
  const remaining = refundableRemaining({ paid: line.paid, alreadyRefunded: line.alreadyRefunded });
  const unitsLeft = line.quantity - line.returnedQuantity;
  const initialQty = line.approvedReturn ? Math.min(line.approvedReturn.quantity, unitsLeft) : 0;
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(initialQty));
  const [amount, setAmount] = useState(() => String(suggestRefundAmount({ paid: line.paid, quantity: line.quantity, returnQty: initialQty, alreadyRefunded: line.alreadyRefunded, alreadyReturnedQty: line.returnedQuantity }) || remaining));
  const [reason, setReason] = useState(line.approvedReturn ? "Return approved" : "");
  const [restock, setRestock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (remaining <= 0) return null;

  const amountNum = Number(amount);
  const valid = Number.isFinite(amountNum) && amountNum > 0 && amountNum <= remaining + 1e-9;
  const cumulative = line.paid - remaining + (valid ? amountNum : 0);
  const before = refundShare({ commission: line.commission, payout: line.payout, paid: line.paid, cumulativeRefunded: line.paid - remaining });
  const after = refundShare({ commission: line.commission, payout: line.payout, paid: line.paid, cumulativeRefunded: cumulative });

  function onQty(value: string) {
    setQty(value);
    const q = Math.max(0, Math.min(unitsLeft, Math.floor(Number(value) || 0)));
    if (q > 0) setAmount(String(suggestRefundAmount({ paid: line.paid, quantity: line.quantity, returnQty: q, alreadyRefunded: line.alreadyRefunded, alreadyReturnedQty: line.returnedQuantity })));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await issueRefundAction({
        orderItemId: line.orderItemId, amount: amountNum, reason, returnRequestId: line.approvedReturn?.id ?? null,
        returnedQty: Math.max(0, Math.floor(Number(qty) || 0)), restock: restock && Number(qty) > 0,
      });
      if (!result.ok) return setError(result.error);
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant={line.approvedReturn ? "primary" : "secondary"} onClick={() => setOpen(true)}>{label}</Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={`Refund ${line.productName}`}
        description={`The customer paid ${formatCurrency(line.paid)} for this item. You can refund up to ${formatCurrency(remaining)} more; it goes back to their original payment method.`}
      >
        <div className="space-y-3">
          <div>
            <Label htmlFor="refund-amount">Amount to refund (₹)</Label>
            <Input id="refund-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="refund-qty">Units coming back (0 if the customer keeps the item)</Label>
            <Input id="refund-qty" inputMode="numeric" value={qty} onChange={(e) => onQty(e.target.value)} />
          </div>
          {Number(qty) > 0 ? (
            <label className="flex items-center gap-2 text-sm text-brand-dark">
              <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} /> Put the returned unit(s) back on sale (only if resellable)
            </label>
          ) : null}
          <div>
            <Label htmlFor="refund-reason">Reason (kept on record)</Label>
            <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Arrived damaged" />
          </div>
          {valid ? (
            <p className="rounded-xl bg-brand-accent/60 p-3 text-xs text-brand-dark/80">
              Effect on the boutique: earnings on this item drop by {formatCurrency(after.payout - before.payout)} and GiftPing returns {formatCurrency(after.commission - before.commission)} of its commission.
              If the item was already paid out, that amount is deducted from the boutique&apos;s next payout.
            </p>
          ) : null}
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending || !valid || reason.trim().length < 3}>{pending ? "Refunding…" : `Refund ${valid ? formatCurrency(amountNum) : ""}`}</Button>
        </div>
      </Modal>
    </>
  );
}

export function RetryRefundButton({ refundId }: { refundId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await retryRefundAction(refundId);
          if (result.ok) toast.success(result.message);
          else toast.error(result.error);
          router.refresh();
        })
      }
    >
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}

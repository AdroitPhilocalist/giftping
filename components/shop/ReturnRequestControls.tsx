"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { cancelReturnAction, requestReturnAction } from "@/lib/account/return-actions";
import { RETURN_REASONS, type ReturnReason } from "@/lib/commerce/refunds";

/** Customer: ask to return (part of) a delivered item. Every rule is re-checked by the database; this only collects the request. */
export function RequestReturnButton({ orderItemId, productName, maxQuantity, closesOn }: { orderItemId: string; productName: string; maxQuantity: number; closesOn: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState<ReturnReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!reason) return setError("Choose a reason.");
    startTransition(async () => {
      const result = await requestReturnAction({ orderItemId, quantity: Number(quantity), reason, details });
      if (!result.ok) return setError(result.error ?? "Something went wrong.");
      toast.success("Request sent. We'll review it and email you.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>Return or report a problem</Button>
      <Modal open={open} onOpenChange={setOpen} title={`Return ${productName}`} description={`Tell us what went wrong and our team will review it${closesOn ? ` (you can request a return until ${closesOn})` : ""}. Nothing is refunded until it's approved.`}>
        <div className="space-y-3">
          {maxQuantity > 1 ? (
            <div>
              <Label htmlFor="return-qty">How many units? (up to {maxQuantity})</Label>
              <Input id="return-qty" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          ) : null}
          <div>
            <Label htmlFor="return-reason">Reason</Label>
            <Select id="return-reason" value={reason} onChange={(e) => setReason(e.target.value as ReturnReason | "")}>
              <option value="">Choose…</option>
              {Object.entries(RETURN_REASONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="return-details">Anything else we should know? (optional)</Label>
            <Textarea id="return-details" value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} />
          </div>
        </div>
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" onClick={submit} disabled={pending}>{pending ? "Sending…" : "Send request"}</Button>
        </div>
      </Modal>
    </>
  );
}

export function CancelReturnButton({ returnId }: { returnId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-xs text-brand-primary underline disabled:opacity-50"
      onClick={() =>
        startTransition(async () => {
          const result = await cancelReturnAction(returnId);
          if (result.ok) toast.success("Request cancelled.");
          else toast.error(result.error ?? "Couldn't cancel.");
          router.refresh();
        })
      }
    >
      {pending ? "Cancelling…" : "Cancel request"}
    </button>
  );
}

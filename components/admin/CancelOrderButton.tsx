"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { cancelOrderAction } from "@/lib/admin/order-actions";

export function CancelOrderButton({ orderId, orderNumber, paid, alreadyCancelled, refundPending }: { orderId: string; orderNumber: string; paid: boolean; alreadyCancelled: boolean; refundPending: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(refundPending ? "Retrying failed refund" : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // A cancelled order with a captured payment is a refund that failed earlier: offer to retry it.
  if (alreadyCancelled && !refundPending) return null;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await cancelOrderAction({ orderId, reason });
      if (!result.ok) return setError(result.error ?? "Something went wrong.");
      toast.success(result.message ?? "Done.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant={refundPending ? "primary" : "secondary"} onClick={() => setOpen(true)}>
        {refundPending ? "Retry refund" : paid ? "Cancel & refund" : "Cancel order"}
      </Button>
      <Modal
        open={open}
        onOpenChange={setOpen}
        title={refundPending ? `Retry refund for ${orderNumber}` : `Cancel ${orderNumber}?`}
        description={paid ? "The order is cancelled, stock returns to the shelf, vendors are told not to ship, and the customer is refunded in full to their original payment method." : "The order is cancelled and any coupon use is released. Nothing was charged."}
      >
        <label htmlFor="cancel-reason" className="mb-1 block text-sm font-medium text-brand-dark">Reason (the customer is told)</label>
        <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Item damaged in the warehouse" />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Keep the order</Button>
          <Button size="sm" onClick={submit} disabled={pending} className="bg-red-700 hover:bg-red-800">
            {pending ? "Working…" : refundPending ? "Retry refund" : paid ? "Cancel and refund" : "Cancel order"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

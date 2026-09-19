"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { acceptOrderAction, bookShipmentAction } from "@/lib/vendor/fulfilment-actions";
import { SHIPMENT_STATUS_LABEL } from "@/lib/integrations/shiprocket-status";
import type { VendorOrder } from "@/lib/db/vendor-portal";

/** Accept -> book courier -> read-only tracking summary. All authority is server-side; this only drives the forms. */
export function OrderFulfilment({
  order,
  defaultWeightGrams,
  courierEnabled,
}: {
  order: VendorOrder;
  defaultWeightGrams: number;
  courierEnabled: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pkg, setPkg] = useState({ weightGrams: String(defaultWeightGrams), lengthCm: "20", breadthCm: "15", heightCm: "10" });
  const [error, setError] = useState<string | null>(null);

  const shipment = order.shipment;
  const pending = order.items.some((i) => i.fulfilment_status === "pending");
  const cancelled = ["cancelled", "refunded"].includes(order.orderStatus);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptOrderAction(order.orderId);
      if (result.error) setError(result.error);
      else {
        toast.success("Order accepted — pack it, then book the courier.");
        router.refresh();
      }
    });
  }

  function book() {
    setError(null);
    startTransition(async () => {
      const result = await bookShipmentAction({ orderId: order.orderId, ...pkg });
      if (result.error) {
        setError(result.error);
        router.refresh();
        return;
      }
      toast.success(`Courier booked — AWB ${result.awb}.`);
      if (result.warning) toast(result.warning);
      router.refresh();
    });
  }

  if (cancelled) return <p className="text-sm text-brand-dark/50">This order was cancelled.</p>;

  if (shipment?.awb_number) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-primary/5 p-3 text-sm">
        <div>
          <p className="flex items-center gap-2 font-medium text-brand-primary">
            <Truck className="h-4 w-4" />
            {SHIPMENT_STATUS_LABEL[shipment.status] ?? shipment.status}
          </p>
          <p className="text-brand-dark/70">
            {shipment.courier_name ?? "Courier"} · AWB {shipment.awb_number}
            {shipment.estimated_delivery ? ` · ETA ${shipment.estimated_delivery}` : ""}
          </p>
        </div>
        {shipment.tracking_url ? (
          <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-brand-primary underline">
            Track <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    );
  }

  if (pending) {
    return (
      <div>
        <Button size="sm" onClick={accept} disabled={isPending}>
          {isPending ? "Accepting…" : "Accept order"}
        </Button>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-brand-dark/10 p-3">
      <p className="text-sm font-medium text-brand-dark">Book courier pickup</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["weightGrams", "Weight (g)"],
            ["lengthCm", "Length (cm)"],
            ["breadthCm", "Breadth (cm)"],
            ["heightCm", "Height (cm)"],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <Label htmlFor={`${key}-${order.orderId}`}>{label}</Label>
            <Input
              id={`${key}-${order.orderId}`}
              inputMode="decimal"
              value={pkg[key]}
              onChange={(e) => setPkg((p) => ({ ...p, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={book} disabled={isPending || !courierEnabled}>
          {isPending ? "Booking…" : "Book courier"}
        </Button>
        {!courierEnabled ? <span className="text-xs text-brand-dark/60">Courier booking isn&apos;t switched on yet.</span> : null}
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}

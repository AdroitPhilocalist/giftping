"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { removeVendorBrandingAction, setCommissionOverrideAction, setVendorSuspendedAction } from "@/lib/admin/vendor-actions";

export function VendorAdminControls({ vendorId, name, status, commissionOverride, hasLogo = false, hasBanner = false }: { vendorId: string; name: string; status: string; commissionOverride: number | null; hasLogo?: boolean; hasBanner?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(commissionOverride === null ? "" : String(commissionOverride));

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done: string, onError: (e: string) => void) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return onError(r.error ?? "Something went wrong.");
      toast.success(r.message ?? done);
      setSuspending(false);
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
      <form className="flex items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); run(() => setCommissionOverrideAction(vendorId, rate), "Commission saved (applies to new orders).", (m) => toast.error(m)); }}>
        <label htmlFor={`rate-${vendorId}`} className="text-brand-dark/50">Commission %</label>
        <Input id={`rate-${vendorId}`} inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="default" className="h-8 w-24 px-2 py-1 text-xs" />
        <Button type="submit" size="sm" variant="ghost" disabled={pending}>Save</Button>
      </form>
      {hasLogo || hasBanner ? (
        <span className="flex items-center gap-3 text-brand-dark/50">
          Take down:
          {hasLogo ? <button type="button" disabled={pending} onClick={() => confirm(`Remove ${name}'s logo? The vendor is told.`) && run(() => removeVendorBrandingAction(vendorId, "logo"), "Logo removed.", (m) => toast.error(m))} className="hover:text-red-700">logo</button> : null}
          {hasBanner ? <button type="button" disabled={pending} onClick={() => confirm(`Remove ${name}'s banner? The vendor is told.`) && run(() => removeVendorBrandingAction(vendorId, "banner"), "Banner removed.", (m) => toast.error(m))} className="hover:text-red-700">banner</button> : null}
        </span>
      ) : null}
      {status === "approved" ? (
        <button type="button" onClick={() => { setReason(""); setError(null); setSuspending(true); }} className="text-brand-dark/60 hover:text-red-700">Suspend</button>
      ) : status === "suspended" ? (
        <button type="button" disabled={pending} onClick={() => run(() => setVendorSuspendedAction(vendorId, false), "Boutique reinstated.", (m) => toast.error(m))} className="font-medium text-brand-primary hover:underline">Reinstate</button>
      ) : null}
      <Modal open={suspending} onOpenChange={setSuspending} title={`Suspend ${name}?`} description="Their products disappear from the mall immediately and they can't use the vendor portal. Paid orders stay visible to you so you can look after them. The vendor is told why.">
        <label htmlFor={`sus-${vendorId}`} className="mb-1 block text-sm font-medium text-brand-dark">Reason</label>
        <Textarea id={`sus-${vendorId}`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repeated late dispatch" />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setSuspending(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" className="bg-red-700 hover:bg-red-800" disabled={pending} onClick={() => run(() => setVendorSuspendedAction(vendorId, true, reason), "Boutique suspended.", setError)}>{pending ? "Suspending…" : "Suspend boutique"}</Button>
        </div>
      </Modal>
    </div>
  );
}

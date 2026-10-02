"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { removeVendorBrandingAction, setCommissionOverrideAction, setVendorFeaturedAction, setVendorSuspendedAction } from "@/lib/admin/vendor-actions";
import { messageVendorAction } from "@/lib/admin/vendor-message-actions";

export function VendorAdminControls({ vendorId, name, status, commissionOverride, hasLogo = false, hasBanner = false, isFeatured = false }: { vendorId: string; name: string; status: string; commissionOverride: number | null; hasLogo?: boolean; hasBanner?: boolean; isFeatured?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [suspending, setSuspending] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(commissionOverride === null ? "" : String(commissionOverride));
  const [messaging, setMessaging] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [messageError, setMessageError] = useState<string | null>(null);

  // `after` runs only on success — each caller closes its OWN modal (a shared `run()` used to hardcode
  // closing the suspend modal specifically, which meant a different action's modal, like "Message" below,
  // never closed itself on success even though the toast reported success).
  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, done: string, onError: (e: string) => void, after?: () => void) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return onError(r.error ?? "Something went wrong.");
      toast.success(r.message ?? done);
      after?.();
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
      <button type="button" onClick={() => { setSubject(""); setMessage(""); setMessageError(null); setMessaging(true); }} className="text-brand-dark/60 hover:text-brand-primary">Message</button>
      <button type="button" disabled={pending} onClick={() => run(() => setVendorFeaturedAction(vendorId, !isFeatured), isFeatured ? "Removed from the featured showcase." : "Featured on the homepage and Boutiques menu.", (m) => toast.error(m))} className={isFeatured ? "font-medium text-brand-secondary-dark hover:underline" : "text-brand-dark/60 hover:text-brand-primary"}>
        {isFeatured ? "★ Featured" : "Feature"}
      </button>
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
          <Button size="sm" className="bg-red-700 hover:bg-red-800" disabled={pending} onClick={() => run(() => setVendorSuspendedAction(vendorId, true, reason), "Boutique suspended.", setError, () => setSuspending(false))}>{pending ? "Suspending…" : "Suspend boutique"}</Button>
        </div>
      </Modal>
      <Modal open={messaging} onOpenChange={setMessaging} title={`Message ${name}`} description="Sent to their notification inbox and, unless they've opted out, their email.">
        <label htmlFor={`msg-subject-${vendorId}`} className="mb-1 block text-sm font-medium text-brand-dark">Subject</label>
        <Input id={`msg-subject-${vendorId}`} value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Update to our packaging guidelines" />
        <label htmlFor={`msg-body-${vendorId}`} className="mb-1 mt-3 block text-sm font-medium text-brand-dark">Message</label>
        <Textarea id={`msg-body-${vendorId}`} value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" className="min-h-32" />
        {messageError ? <p role="alert" className="mt-3 text-sm text-red-700">{messageError}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setMessaging(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" disabled={pending} onClick={() => run(() => messageVendorAction(vendorId, subject, message), "Message sent.", setMessageError, () => setMessaging(false))}>{pending ? "Sending…" : "Send message"}</Button>
        </div>
      </Modal>
    </div>
  );
}

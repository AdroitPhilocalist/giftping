"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { broadcastVendorMessageAction } from "@/lib/admin/vendor-message-actions";

/** Sends the same official message to every approved vendor at once. */
export function BroadcastVendorMessage({ vendorCount }: { vendorCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!confirm(`Send this to all ${vendorCount} approved vendors?`)) return;
    startTransition(async () => {
      const result = await broadcastVendorMessageAction(subject, message);
      if (!result.ok) return setError(result.error ?? "Something went wrong.");
      toast.success(`Sent to ${result.sent} ${result.sent === 1 ? "vendor" : "vendors"}.`);
      setOpen(false);
      setSubject("");
      setMessage("");
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Megaphone className="h-4 w-4" aria-hidden="true" />
        Message all vendors
      </Button>
      <Modal open={open} onOpenChange={setOpen} title="Message all vendors" description={`Sent to all ${vendorCount} approved vendors' notification inbox and, unless they've opted out, their email.`}>
        <label htmlFor="broadcast-subject" className="mb-1 block text-sm font-medium text-brand-dark">Subject</label>
        <Input id="broadcast-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Upcoming festive-season dispatch deadlines" />
        <label htmlFor="broadcast-body" className="mb-1 mt-3 block text-sm font-medium text-brand-dark">Message</label>
        <Textarea id="broadcast-body" value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message…" className="min-h-32" />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" disabled={pending} onClick={submit}>{pending ? "Sending…" : `Send to ${vendorCount} vendors`}</Button>
        </div>
      </Modal>
    </>
  );
}

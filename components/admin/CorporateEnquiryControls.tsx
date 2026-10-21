"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { updateCorporateEnquiryAction } from "@/lib/admin/corporate-enquiry-actions";
import {
  CORPORATE_ENQUIRY_STATUSES,
  CORPORATE_ENQUIRY_STATUS_LABELS,
  type CorporateEnquiryStatus,
} from "@/lib/validation/corporate-enquiry.schema";

export function CorporateEnquiryControls({
  id,
  status,
  internalNote,
}: {
  id: string;
  status: CorporateEnquiryStatus;
  internalNote: string | null;
}) {
  const [statusValue, setStatusValue] = useState(status);
  const [note, setNote] = useState(internalNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateCorporateEnquiryAction({ id, status: statusValue, internalNote: note });
      if (!result.success) {
        setError(result.error ?? "Couldn't save that change.");
        return;
      }
      setSaved(true);
    });
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-brand-dark/[0.07] bg-brand-light/70 p-3">
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <div>
          <Label htmlFor={`status-${id}`} className="text-xs">Status</Label>
          <Select id={`status-${id}`} value={statusValue} onChange={(event) => setStatusValue(event.target.value as CorporateEnquiryStatus)}>
            {CORPORATE_ENQUIRY_STATUSES.map((value) => <option key={value} value={value}>{CORPORATE_ENQUIRY_STATUS_LABELS[value]}</option>)}
          </Select>
        </div>
        <div>
          <Label htmlFor={`note-${id}`} className="text-xs">Internal note</Label>
          <Input id={`note-${id}`} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Shortlist sent, waiting to hear back…" maxLength={2000} />
        </div>
        <Button type="submit" size="sm" variant="secondary" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isPending ? "Saving…" : "Save"}
        </Button>
      </div>
      {error ? <p role="alert" className="mt-2 text-xs text-red-600">{error}</p> : null}
      {saved ? (
        <p role="status" className="mt-2 flex items-center gap-1 text-xs text-brand-primary">
          <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
        </p>
      ) : null}
    </form>
  );
}

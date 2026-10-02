"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { saveCampaignAction } from "@/lib/admin/campaign-actions";
import { SEGMENTS, type SegmentKey } from "@/lib/marketing/segments";
import { campaignSchema } from "@/lib/validation/campaign.schema";

export interface CampaignFormValues {
  name: string;
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  segment: SegmentKey;
}
const EMPTY: CampaignFormValues = { name: "", subject: "", preheader: "", body: "", ctaLabel: "", ctaUrl: "", segment: "all" };

export function CampaignForm({ id, initial, counts }: { id?: string; initial?: CampaignFormValues; counts: Record<SegmentKey, number> }) {
  const router = useRouter();
  const [form, setForm] = useState<CampaignFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof CampaignFormValues>(k: K, v: CampaignFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = campaignSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveCampaignAction(form, id);
      if (result.error || !result.id) return setError(result.error ?? "Couldn't save.");
      toast.success("Saved.");
      if (id) router.refresh();
      else router.push(`/admin/campaigns/${result.id}`);
    });
  }

  const field = (label: string, htmlFor: string, node: React.ReactNode, hint?: string) => (
    <div><Label htmlFor={htmlFor}>{label}</Label>{node}{hint ? <p className="mt-1 text-xs text-brand-dark/50">{hint}</p> : null}</div>
  );
  const segment = SEGMENTS.find((s) => s.key === form.segment)!;

  return (
    <form onSubmit={submit} className="space-y-4">
      {field("Internal name", "c-name", <Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={120} />, "Only you see this.")}
      {field("Subject line", "c-subject", <Input id="c-subject" value={form.subject} onChange={(e) => set("subject", e.target.value)} maxLength={150} />, "Also shown as the heading inside the email.")}
      {field("Preview text (optional)", "c-pre", <Input id="c-pre" value={form.preheader} onChange={(e) => set("preheader", e.target.value)} maxLength={200} />, "The grey line many inboxes show after the subject.")}
      {field("Message", "c-body", <Textarea id="c-body" rows={10} value={form.body} onChange={(e) => set("body", e.target.value)} maxLength={5000} />, "Plain text. A blank line starts a new paragraph. Each email opens with “Hi <their first name>,” — don't add your own greeting. Links and formatting aren't allowed in the text; use the button below.")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field("Button text (optional)", "c-cta-label", <Input id="c-cta-label" value={form.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} maxLength={40} placeholder="Shop the collection" />)}
        {field("Button link", "c-cta-url", <Input id="c-cta-url" value={form.ctaUrl} onChange={(e) => set("ctaUrl", e.target.value)} placeholder="/mall or https://…" />, "A page on this site (like /mall) or a full https:// address.")}
      </div>
      {field(
        "Who gets it",
        "c-segment",
        <Select id="c-segment" value={form.segment} onChange={(e) => set("segment", e.target.value as SegmentKey)}>
          {SEGMENTS.map((s) => <option key={s.key} value={s.key}>{s.label} — {counts[s.key]} {counts[s.key] === 1 ? "person" : "people"}</option>)}
        </Select>,
        `${segment.description} Only people who opted in are ever included, and anyone who unsubscribes before their turn is skipped.`,
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : id ? "Save draft" : "Create draft"}</Button>
    </form>
  );
}

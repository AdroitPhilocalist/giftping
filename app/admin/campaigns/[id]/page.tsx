import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { CampaignControls } from "@/components/admin/CampaignControls";
import { CampaignForm } from "@/components/admin/CampaignForm";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { audienceCounts } from "@/lib/marketing/audience";
import { buildCampaignEmail } from "@/lib/marketing/campaign-email";
import { senderLine, usageSoFar } from "@/lib/marketing/sender";
import { getMarketingLimits } from "@/lib/marketing/settings";
import { estimateFinish } from "@/lib/marketing/send-plan";
import { SEGMENTS, type SegmentKey } from "@/lib/marketing/segments";

export const metadata = { title: "Campaign — GiftPing Admin" };

const STATUSES = ["queued", "sending", "sent", "failed", "skipped"] as const;

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("admin");
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: c } = await supabase.from("marketing_campaigns").select("*").eq("id", id).maybeSingle();
  if (!c) notFound();

  const segment = SEGMENTS.find((s) => s.key === c.segment);
  const [counts, limits, usage, ...perStatus] = await Promise.all([
    c.status === "draft" ? audienceCounts() : Promise.resolve(null),
    getMarketingLimits(),
    usageSoFar(),
    ...STATUSES.map((s) => supabase.from("marketing_campaign_recipients").select("user_id", { count: "exact", head: true }).eq("campaign_id", id).eq("status", s)),
  ]);
  const by = Object.fromEntries(STATUSES.map((s, i) => [s, perStatus[i].count ?? 0])) as Record<(typeof STATUSES)[number], number>;
  const waiting = by.queued + by.sending;
  const audience = counts ? counts[c.segment as SegmentKey] : c.recipient_count;
  const eta = estimateFinish(c.status === "draft" ? audience : waiting, { ...limits, ...usage });

  // What the email will look like (sample name, inert links). Rendered in a sandboxed iframe so it can never run anything on this page.
  const preview = buildCampaignEmail({
    firstName: "Asha",
    subject: c.subject,
    preheader: c.preheader,
    body: c.body,
    cta: c.cta_label && c.cta_url ? { label: c.cta_label, url: c.cta_url.startsWith("/") ? `https://example.com${c.cta_url}` : c.cta_url } : null,
    unsubscribeUrl: "https://example.com/unsubscribe",
    preferencesUrl: "https://example.com/account/notifications",
    senderLine: senderLine(),
  });

  const etaText =
    eta.days === null ? "Sending is switched off (a limit is 0)." : eta.days <= 1 ? "Fits within today's limit." : `At the current limit this takes about ${eta.days} days${eta.monthlyLimited ? " — and won't fit in this month's limit, so it will continue next month" : ""}.`;

  return (
    <div className="max-w-5xl">
      <Link href="/admin/campaigns" className="text-sm text-brand-dark/60 hover:underline">← Campaigns</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl text-brand-dark">{c.name}</h1>
        <Badge variant={c.status === "sent" ? "primary" : c.status === "sending" ? "gold" : "neutral"}>{c.status}</Badge>
      </div>
      <p className="mt-1 text-sm text-brand-dark/60">{segment?.label ?? c.segment} · {audience} {audience === 1 ? "person" : "people"}{c.status === "draft" ? " would receive it" : ""}</p>

      <div className="mt-4"><CampaignControls id={c.id} status={c.status} failed={by.failed} startSummary={`This will email ${audience} ${audience === 1 ? "person" : "people"} (${segment?.label ?? c.segment}). ${etaText}`} /></div>

      {c.status !== "draft" ? (
        <section aria-label="Progress" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {STATUSES.map((s) => (
            <div key={s} className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-3">
              <p className="text-xs uppercase tracking-wide text-brand-dark/50">{s === "sending" ? "in flight" : s}</p>
              <p className="mt-1 font-heading text-2xl text-brand-dark">{by[s]}</p>
            </div>
          ))}
        </section>
      ) : null}
      {(c.status === "sending" || c.status === "draft") && audience > 0 ? <p className="mt-3 text-sm text-brand-dark/70">{etaText}</p> : null}
      {by.skipped > 0 ? <p className="mt-1 text-xs text-brand-dark/50">“Skipped” = no longer opted in (or the account was removed) when it was their turn, or the campaign was cancelled.</p> : null}
      {by.failed > 0 ? <p className="mt-1 text-xs text-brand-dark/50">“Failed” emails are not retried automatically — a timeout can still have delivered, and a duplicate marketing email is worse than a missed one.</p> : null}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        <div>
          <h2 className="font-heading text-lg text-brand-dark">{c.status === "draft" ? "Edit draft" : "What was sent"}</h2>
          {c.status === "draft" && counts ? (
            <div className="mt-3">
              <CampaignForm
                id={c.id}
                counts={counts}
                initial={{ name: c.name, subject: c.subject, preheader: c.preheader ?? "", body: c.body, ctaLabel: c.cta_label ?? "", ctaUrl: c.cta_url ?? "", segment: c.segment as SegmentKey }}
              />
            </div>
          ) : (
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-xs uppercase tracking-wide text-brand-dark/50">Subject</dt><dd className="text-brand-dark">{c.subject}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-brand-dark/50">Message</dt><dd className="whitespace-pre-wrap text-brand-dark/80">{c.body}</dd></div>
              {c.cta_label ? <div><dt className="text-xs uppercase tracking-wide text-brand-dark/50">Button</dt><dd className="text-brand-dark/80">{c.cta_label} → {c.cta_url}</dd></div> : null}
            </dl>
          )}
        </div>
        <div>
          <h2 className="font-heading text-lg text-brand-dark">Preview</h2>
          <p className="mt-1 text-xs text-brand-dark/50">As “Asha” would see it. Links are inert here. The unsubscribe link in each real email is unique to its recipient.</p>
          <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="mt-3 h-[34rem] w-full rounded-2xl border border-brand-dark/10 bg-brand-surface" />
        </div>
      </div>
    </div>
  );
}

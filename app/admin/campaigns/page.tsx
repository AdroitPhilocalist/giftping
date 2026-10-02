import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { CampaignLimitsForm } from "@/components/admin/CampaignLimitsForm";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { requireRole } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { isResendConfigured } from "@/lib/integrations/resend";
import { loadSubscribers } from "@/lib/marketing/audience";
import { unsubscribeSecret, usageSoFar } from "@/lib/marketing/sender";
import { getMarketingLimits } from "@/lib/marketing/settings";
import { sendAllowance } from "@/lib/marketing/send-plan";
import { SEGMENTS } from "@/lib/marketing/segments";

export const metadata = { title: "Campaigns — GiftPing Admin" };

const STATUS_BADGE = { draft: "neutral", sending: "gold", paused: "neutral", sent: "primary", cancelled: "neutral" } as const;

export default async function AdminCampaignsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const admin = createAdminClient();
  const [{ data: campaigns }, limits, usage, subscribers, { count: customers }] = await Promise.all([
    supabase.from("marketing_campaigns").select("id, name, subject, segment, status, recipient_count, created_at, started_at").order("created_at", { ascending: false }).limit(100),
    getMarketingLimits(),
    usageSoFar(),
    loadSubscribers(),
    admin.from("users").select("id", { count: "exact", head: true }).eq("role", "customer").is("anonymized_at", null).is("deleted_at", null),
  ]);
  const allowance = sendAllowance({ ...limits, ...usage });
  const total = customers ?? 0;
  const secretOk = Boolean(unsubscribeSecret());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Email campaigns</h1>
          <p className="mt-1 max-w-2xl text-sm text-brand-dark/60">Offers and announcements to customers who have <strong>opted in</strong>. Nobody is on the list unless they ticked the box at sign-up or switched it on in their settings, and every email has a one-click unsubscribe.</p>
        </div>
        <Button asChild><Link href="/admin/campaigns/new">New campaign</Link></Button>
      </div>

      {!secretOk ? (
        <p className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Sending is switched off.</strong> <code>MARKETING_UNSUBSCRIBE_SECRET</code> isn&apos;t set (it must be at least 24 characters). Without it an email can&apos;t carry a working unsubscribe link, so nothing is sent. Set it in the environment, then reload.</span></p>
      ) : null}
      {!isResendConfigured() ? (
        <p className="flex items-start gap-2 rounded-xl bg-brand-accent/70 px-4 py-3 text-sm text-brand-dark"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />No email provider key is configured, so campaigns will queue but nothing will be delivered.</p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
          <h2 className="font-heading text-lg text-brand-dark">Audience</h2>
          <p className="mt-2 font-heading text-3xl text-brand-dark">{subscribers.length.toLocaleString("en-IN")}</p>
          <p className="text-sm text-brand-dark/60">{total > 0 ? `of ${total.toLocaleString("en-IN")} customers (${Math.round((subscribers.length / total) * 100)}%) have opted in.` : "customers have opted in."}</p>
          <p className="mt-2 text-xs text-brand-dark/50">Counts only — individual addresses aren&apos;t listed. Segments: {SEGMENTS.map((s) => s.label).join(", ")}.</p>
        </section>
        <section className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
          <h2 className="font-heading text-lg text-brand-dark">Sending limits</h2>
          <p className="mt-1 text-sm text-brand-dark/70">Sent today: <strong>{usage.sentToday}</strong> of {limits.dailyCap} · this month: <strong>{usage.sentThisMonth}</strong> of {limits.monthlyCap} · room left now: <strong>{allowance}</strong></p>
          <p className="mt-1 text-xs text-brand-dark/50">Order and diary emails use the same email account allowance, so keep these well below your plan&apos;s limits. When you move to a paid email plan, raise them here — nothing else changes.</p>
          <CampaignLimitsForm dailyCap={limits.dailyCap} monthlyCap={limits.monthlyCap} />
        </section>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No campaigns yet.</p>
      ) : (
        <ul className="divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
          {campaigns.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/campaigns/${c.id}`} className="flex flex-wrap items-center gap-3 p-4 hover:bg-brand-accent/30">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-dark">{c.name} <Badge variant={STATUS_BADGE[c.status as keyof typeof STATUS_BADGE] ?? "neutral"}>{c.status}</Badge></p>
                  <p className="truncate text-xs text-brand-dark/60">{c.subject} · {SEGMENTS.find((s) => s.key === c.segment)?.label ?? c.segment}</p>
                </div>
                <span className="text-xs text-brand-dark/50">{c.recipient_count > 0 ? `${c.recipient_count} recipients · ` : ""}{new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

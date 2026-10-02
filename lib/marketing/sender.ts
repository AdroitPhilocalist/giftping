import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmailBatch, type BatchResult, type OutgoingEmail } from "@/lib/integrations/resend";
import { appBaseUrl } from "@/lib/notifications/notify";
import { SITE } from "@/lib/site";
import { safeCtaUrl } from "@/lib/content/banners";
import { resolveAudience } from "./audience";
import { buildCampaignEmail, listUnsubscribeHeaders } from "./campaign-email";
import { BATCH_PAUSE_MS, BATCH_SIZE, chunk, sendAllowance, utcDayStart, utcMonthStart } from "./send-plan";
import { getMarketingLimits } from "./settings";
import { signUnsubscribeToken, usableSecret } from "./unsubscribe-token";
import type { SegmentKey } from "./segments";

/**
 * Sending a campaign. Read this before changing anything here — the rules are the point.
 *
 *  - CONSENT IS RE-CHECKED AT THE MOMENT OF SENDING, not just when the audience was frozen. Someone who unsubscribes (or is erased)
 *    between "start" and their turn is marked `skipped` and never emailed.
 *  - AT MOST ONCE. A recipient is claimed (`queued` → `sending`, atomically, only if still queued) before the provider is called, so two
 *    overlapping runs can't both send to them. If a call fails in a way that might still have delivered (timeout, 5xx), those people are
 *    marked `failed`, NOT retried automatically — a duplicate marketing email is worse than a missed one. An admin can re-queue failed
 *    recipients deliberately. Failures that definitely sent nothing (provider not ready, provider quota) release the claim instead.
 *  - BUDGETED. Each run sends at most the daily/monthly allowance (lib/marketing/send-plan.ts), counted from `sent_at`.
 *  - FAILS CLOSED without MARKETING_UNSUBSCRIBE_SECRET: no email may go out without a working unsubscribe link, so nothing is sent.
 *  - Sends through Resend's batch endpoint (≤100 per call, paused between calls) so it stays inside the free tier's request rate.
 */

const sleepReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const STALE_CLAIM_MS = 60 * 60 * 1000;
const FETCH_CAP = 5000; // most recipients one campaign handles in one run (the allowance is usually far smaller)

export interface ProcessReport {
  /** why this run did nothing at all, when it didn't */
  blocked: "no_secret" | "no_allowance" | "provider_not_ready" | "provider_quota" | null;
  campaigns: number;
  sent: number;
  skipped: number;
  failed: number;
  completed: number;
}

export interface ProcessOptions {
  now?: Date;
  /** injectable for tests; production uses Resend's batch endpoint */
  send?: (emails: OutgoingEmail[]) => Promise<BatchResult>;
  sleep?: (ms: number) => Promise<void>;
  /** limit to one campaign (the admin's "send now" button) */
  onlyCampaignId?: string;
}

export function unsubscribeSecret(): string | null {
  return usableSecret(process.env.MARKETING_UNSUBSCRIBE_SECRET);
}

export function senderLine(): string | null {
  const parts = [SITE.name, SITE.businessAddress, SITE.supportEmail].filter(Boolean);
  return parts.length > 1 ? parts.join(" · ") : null;
}

const firstNameOf = (full: string | null) => (full ?? "").trim().split(/\s+/)[0] || null;

/** Everything one recipient's email needs — shared by real sends and the admin's test send. */
export function emailForRecipient(args: {
  campaign: { subject: string; preheader: string | null; body: string; cta_label: string | null; cta_url: string | null };
  userId: string;
  email: string;
  fullName: string | null;
  secret: string;
  base?: string;
}): OutgoingEmail {
  const base = args.base ?? appBaseUrl();
  const token = signUnsubscribeToken(args.userId, args.secret);
  const ctaUrl = args.campaign.cta_url ? safeCtaUrl(args.campaign.cta_url) : null;
  const built = buildCampaignEmail({
    firstName: firstNameOf(args.fullName),
    subject: args.campaign.subject,
    preheader: args.campaign.preheader,
    body: args.campaign.body,
    cta: args.campaign.cta_label && ctaUrl ? { label: args.campaign.cta_label, url: ctaUrl.startsWith("/") ? `${base}${ctaUrl}` : ctaUrl } : null,
    unsubscribeUrl: `${base}/unsubscribe?t=${token}`,
    preferencesUrl: `${base}/account/notifications`,
    senderLine: senderLine(),
  });
  return { to: args.email, subject: built.subject, html: built.html, text: built.text, headers: listUnsubscribeHeaders(`${base}/api/marketing/unsubscribe?t=${token}`) };
}

/** Freeze the audience into the queue and flip the campaign to `sending`. Atomic: only a `draft` can be started, once. */
export async function queueCampaign(campaignId: string, now = new Date()): Promise<{ ok: true; queued: number } | { ok: false; error: string }> {
  if (!unsubscribeSecret()) return { ok: false, error: "MARKETING_UNSUBSCRIBE_SECRET isn't set (or is too short), so emails can't carry a working unsubscribe link. Set it first." };
  const admin = createAdminClient();
  const { data: campaign, error } = await admin.from("marketing_campaigns").select("id, segment, status").eq("id", campaignId).maybeSingle();
  if (error || !campaign) return { ok: false, error: "Campaign not found." };
  if (campaign.status !== "draft") return { ok: false, error: "This campaign has already been started." };

  const audience = await resolveAudience(campaign.segment as SegmentKey, now);
  if (audience.length === 0) return { ok: false, error: "No one is opted in to this segment yet, so there is nobody to send to." };

  // Claim the draft first (so a double-click can't queue twice), then fill the queue.
  const { data: claimed, error: claimError } = await admin
    .from("marketing_campaigns")
    .update({ status: "sending", started_at: now.toISOString(), recipient_count: audience.length })
    .eq("id", campaignId)
    .eq("status", "draft")
    .select("id");
  if (claimError || !claimed || claimed.length === 0) return { ok: false, error: "This campaign has already been started." };

  for (const part of chunk(audience, 500)) {
    const { error: insertError } = await admin
      .from("marketing_campaign_recipients")
      .upsert(part.map((s) => ({ campaign_id: campaignId, user_id: s.id })), { onConflict: "campaign_id,user_id", ignoreDuplicates: true });
    if (insertError) {
      // Put the campaign back so it can be started again cleanly (nobody has been emailed yet).
      await admin.from("marketing_campaign_recipients").delete().eq("campaign_id", campaignId);
      await admin.from("marketing_campaigns").update({ status: "draft", started_at: null, recipient_count: 0 }).eq("id", campaignId);
      return { ok: false, error: "Couldn't queue the recipients. Nothing was sent — try again." };
    }
  }
  return { ok: true, queued: audience.length };
}

/** How many marketing emails have gone out today / this month (UTC), counted from our own record. */
export async function usageSoFar(now = new Date()): Promise<{ sentToday: number; sentThisMonth: number }> {
  const admin = createAdminClient();
  const count = async (since: Date) => {
    const { count: n, error } = await admin.from("marketing_campaign_recipients").select("user_id", { count: "exact", head: true }).eq("status", "sent").gte("sent_at", since.toISOString());
    if (error) throw error;
    return n ?? 0;
  };
  const [sentToday, sentThisMonth] = await Promise.all([count(utcDayStart(now)), count(utcMonthStart(now))]);
  return { sentToday, sentThisMonth };
}

/** Send what the budget allows for every campaign that is `sending`. Safe to call as often as you like. */
export async function processCampaigns(opts: ProcessOptions = {}): Promise<ProcessReport> {
  const now = opts.now ?? new Date();
  const send = opts.send ?? sendEmailBatch;
  const sleep = opts.sleep ?? sleepReal;
  const report: ProcessReport = { blocked: null, campaigns: 0, sent: 0, skipped: 0, failed: 0, completed: 0 };

  const secret = unsubscribeSecret();
  if (!secret) return { ...report, blocked: "no_secret" };

  const admin = createAdminClient();
  const limits = await getMarketingLimits();
  const usage = await usageSoFar(now);
  let allowance = sendAllowance({ ...limits, ...usage });
  if (allowance <= 0) return { ...report, blocked: "no_allowance" };

  let query = admin.from("marketing_campaigns").select("id, subject, preheader, body, cta_label, cta_url").eq("status", "sending").order("started_at", { ascending: true });
  if (opts.onlyCampaignId) query = query.eq("id", opts.onlyCampaignId);
  const { data: campaigns, error } = await query;
  if (error) throw error;

  let firstBatch = true;
  for (const campaign of campaigns ?? []) {
    if (allowance <= 0) break;
    report.campaigns += 1;

    // A claim that never resolved (the run died mid-send) might or might not have delivered — never retry it blindly.
    await admin
      .from("marketing_campaign_recipients")
      .update({ status: "failed", error: "Interrupted before the provider confirmed — not retried automatically to avoid a duplicate." })
      .eq("campaign_id", campaign.id)
      .eq("status", "sending")
      .lt("updated_at", new Date(now.getTime() - STALE_CLAIM_MS).toISOString());

    const { data: queued, error: queuedError } = await admin
      .from("marketing_campaign_recipients")
      .select("user_id")
      .eq("campaign_id", campaign.id)
      .eq("status", "queued")
      .order("user_id", { ascending: true })
      .limit(Math.min(allowance, FETCH_CAP));
    if (queuedError) throw queuedError;

    if ((queued ?? []).length > 0) {
      // Claim them. Only rows we actually flipped are ours; anything another run got first is left alone.
      const { data: claimed, error: claimError } = await admin
        .from("marketing_campaign_recipients")
        .update({ status: "sending", updated_at: now.toISOString() })
        .eq("campaign_id", campaign.id)
        .eq("status", "queued")
        .in("user_id", queued!.map((q) => q.user_id))
        .select("user_id, attempts");
      if (claimError) throw claimError;
      const mine = claimed ?? [];

      // Re-check consent NOW. (Fetched in chunks: the id list would otherwise make the request URL huge.)
      const people = new Map<string, { email: string | null; full_name: string | null; ok: boolean }>();
      for (const ids of chunk(mine.map((m) => m.user_id), 100)) {
        const { data: users, error: usersError } = await admin.from("users").select("id, email, full_name, marketing_opt_in, is_active, role, deleted_at, anonymized_at").in("id", ids);
        if (usersError) throw usersError;
        for (const u of users ?? []) {
          people.set(u.id, { email: u.email, full_name: u.full_name, ok: Boolean(u.marketing_opt_in && u.is_active && u.role === "customer" && !u.deleted_at && !u.anonymized_at && u.email) });
        }
      }

      const eligible = mine.filter((m) => people.get(m.user_id)?.ok);
      const ineligible = mine.filter((m) => !people.get(m.user_id)?.ok);
      for (const part of chunk(ineligible.map((m) => m.user_id), 100)) {
        await admin.from("marketing_campaign_recipients").update({ status: "skipped", error: "No longer opted in (or the account is gone) when it was their turn.", updated_at: now.toISOString() }).eq("campaign_id", campaign.id).in("user_id", part);
      }
      report.skipped += ineligible.length;

      const release = async (ids: string[]) => {
        // Nothing was sent: hand the claim back so it simply waits for the next run.
        for (const part of chunk(ids, 100)) {
          await admin.from("marketing_campaign_recipients").update({ status: "queued", updated_at: new Date().toISOString() }).eq("campaign_id", campaign.id).in("user_id", part).eq("status", "sending");
        }
      };

      let stop = false;
      for (const part of chunk(eligible, BATCH_SIZE)) {
        if (stop) {
          await release(part.map((p) => p.user_id));
          continue;
        }
        if (!firstBatch) await sleep(BATCH_PAUSE_MS);
        firstBatch = false;

        const emails = part.map((p) => {
          const person = people.get(p.user_id)!;
          return emailForRecipient({ campaign, userId: p.user_id, email: person.email!, fullName: person.full_name, secret });
        });
        const result = await send(emails);
        const ids = part.map((p) => p.user_id);

        if (result.ok) {
          const sentAt = new Date().toISOString();
          await admin.from("marketing_campaign_recipients").upsert(
            part.map((p, i) => ({ campaign_id: campaign.id, user_id: p.user_id, status: "sent", attempts: p.attempts + 1, provider_id: result.ids[i], sent_at: sentAt, error: null, updated_at: sentAt })),
            { onConflict: "campaign_id,user_id" },
          );
          report.sent += part.length;
          allowance -= part.length;
        } else if (result.notConfigured || result.quota) {
          // Definitely nothing sent (provider not ready / out of allowance): wait, don't fail anyone.
          report.blocked = result.quota ? "provider_quota" : "provider_not_ready";
          await release(ids);
          stop = true;
        } else {
          // Might have been delivered (timeout, 5xx) or might not: mark failed, never auto-retry.
          for (const idPart of chunk(ids, 100)) {
            await admin.from("marketing_campaign_recipients").update({ status: "failed", error: result.error.slice(0, 300), updated_at: new Date().toISOString() }).eq("campaign_id", campaign.id).in("user_id", idPart);
          }
          report.failed += part.length;
        }
      }
      if (stop) break;
    }

    // Finished when nothing is left waiting or in flight.
    const { count: open, error: openError } = await admin
      .from("marketing_campaign_recipients")
      .select("user_id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .in("status", ["queued", "sending"]);
    if (openError) throw openError;
    if ((open ?? 0) === 0) {
      await admin.from("marketing_campaigns").update({ status: "sent", completed_at: new Date().toISOString() }).eq("id", campaign.id).eq("status", "sending");
      report.completed += 1;
    }
  }
  return report;
}

/** An admin re-queues recipients whose send failed, accepting that an ambiguous failure may then arrive twice. */
export async function requeueFailed(campaignId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("marketing_campaign_recipients")
    .update({ status: "queued", error: null, updated_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("status", "failed")
    .select("user_id");
  if (error) throw error;
  if ((data?.length ?? 0) > 0) await admin.from("marketing_campaigns").update({ status: "sending", completed_at: null }).eq("id", campaignId).in("status", ["sent", "paused"]);
  return data?.length ?? 0;
}

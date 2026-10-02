"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { sendEmail } from "@/lib/integrations/resend";
import { emailForRecipient, processCampaigns, queueCampaign, requeueFailed, unsubscribeSecret } from "@/lib/marketing/sender";
import { campaignSchema, type CampaignInput } from "@/lib/validation/campaign.schema";

// Admin-only. Campaign rows are read/written with the ADMIN's own session (RLS `is_admin()` is the enforcement, as for banners and
// categories); the queue, sending and settings need the service role and sit behind the same role gate. Every state change is audit-logged.
async function gate() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}
const idSchema = z.string().uuid();
const NOT_ADMIN = { error: "Admin access required." } as const;

function refresh(id?: string) {
  revalidatePath("/admin/campaigns");
  if (id) revalidatePath(`/admin/campaigns/${id}`);
}

async function audit(actorId: string, action: string, entityId: string | null, after: Record<string, unknown>) {
  await createAdminClient().from("audit_logs").insert({ actor_id: actorId, action, entity_type: "marketing_campaign", entity_id: entityId, before_data: null, after_data: after as never });
}

export async function saveCampaignAction(raw: CampaignInput, id?: string): Promise<{ error?: string; id?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const c = parsed.data;
  const supabase = await createClient();
  const row = { name: c.name, subject: c.subject, preheader: c.preheader, body: c.body, cta_label: c.ctaLabel, cta_url: c.ctaUrl, segment: c.segment };

  if (id) {
    if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
    // Only a draft may be edited — once it has gone out (or started) the record must keep saying what was actually sent.
    const { data, error } = await supabase.from("marketing_campaigns").update(row).eq("id", id).eq("status", "draft").select("id");
    if (error) return { error: "Couldn't save the campaign." };
    if (!data || data.length === 0) return { error: "Only a draft can be edited." };
    refresh(id);
    return { id };
  }
  const { data, error } = await supabase.from("marketing_campaigns").insert({ ...row, created_by: user.id }).select("id").single();
  if (error || !data) return { error: "Couldn't create the campaign." };
  await audit(user.id, "campaign.created", data.id, { name: c.name, segment: c.segment });
  refresh();
  return { id: data.id };
}

export async function deleteDraftAction(id: string): Promise<{ error?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const { data, error } = await (await createClient()).from("marketing_campaigns").delete().eq("id", id).eq("status", "draft").select("id");
  if (error || !data || data.length === 0) return { error: "Only a draft can be deleted." };
  await audit(user.id, "campaign.deleted", id, {});
  refresh();
  return {};
}

/** One test email to the signed-in admin's own address (counts as one email against the provider's allowance; not part of any campaign). */
export async function sendTestEmailAction(id: string): Promise<{ error?: string; message?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const secret = unsubscribeSecret();
  if (!secret) return { error: "MARKETING_UNSUBSCRIBE_SECRET isn't set (or is too short), so a real email can't be built." };
  const admin = createAdminClient();
  const [{ data: campaign }, { data: me }] = await Promise.all([
    admin.from("marketing_campaigns").select("subject, preheader, body, cta_label, cta_url").eq("id", id).maybeSingle(),
    admin.from("users").select("email, full_name").eq("id", user.id).maybeSingle(),
  ]);
  if (!campaign) return { error: "Campaign not found." };
  if (!me?.email) return { error: "Your account has no email address." };
  const email = emailForRecipient({ campaign, userId: user.id, email: me.email, fullName: me.full_name, secret });
  const result = await sendEmail({ ...email, subject: `[TEST] ${email.subject}` });
  if (result.ok) return { message: `A test email is on its way to ${me.email}.` };
  if (result.notConfigured) return { error: "The email provider isn't ready to send to this address yet (no API key, or the sending domain isn't verified — until then it only delivers to the Resend account owner)." };
  return { error: `The provider refused it: ${result.error}` };
}

export async function startCampaignAction(id: string): Promise<{ error?: string; message?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const queued = await queueCampaign(id);
  if (!queued.ok) return { error: queued.error };
  await audit(user.id, "campaign.started", id, { recipients: queued.queued });
  // Send the first batch right away so the admin sees it working; the rest follows the daily budget.
  const report = await processCampaigns({ onlyCampaignId: id });
  refresh(id);
  return { message: describeRun(queued.queued, report) };
}

export async function sendNextBatchAction(id: string): Promise<{ error?: string; message?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const report = await processCampaigns({ onlyCampaignId: id });
  refresh(id);
  return { message: describeRun(null, report) };
}

function describeRun(queued: number | null, r: Awaited<ReturnType<typeof processCampaigns>>): string {
  const head = queued !== null ? `Queued ${queued} ${queued === 1 ? "person" : "people"}. ` : "";
  if (r.blocked === "no_secret") return `${head}Nothing sent: the unsubscribe secret isn't configured.`;
  if (r.blocked === "no_allowance") return `${head}Today's sending limit is used up — the rest will go out automatically tomorrow (or raise the limit below).`;
  if (r.blocked === "provider_not_ready") return `${head}The email provider isn't ready to send yet (no API key, or the sending domain isn't verified). Nothing was lost — recipients stay queued.`;
  if (r.blocked === "provider_quota") return `${head}The email provider says its allowance is used up. Recipients stay queued and will go out on a later run.`;
  return `${head}Sent ${r.sent}${r.skipped ? `, skipped ${r.skipped} who had unsubscribed` : ""}${r.failed ? `, ${r.failed} failed` : ""}.`;
}

async function setStatus(id: string, from: string[], to: "paused" | "sending" | "cancelled", action: string): Promise<{ error?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const admin = createAdminClient();
  const patch = to === "cancelled" ? { status: to, completed_at: new Date().toISOString() } : { status: to };
  const { data, error } = await admin.from("marketing_campaigns").update(patch).eq("id", id).in("status", from).select("id");
  if (error || !data || data.length === 0) return { error: "That isn't possible in this campaign's current state." };
  if (to === "cancelled") {
    // Whoever hadn't been emailed yet will not be.
    await admin.from("marketing_campaign_recipients").update({ status: "skipped", error: "Campaign cancelled.", updated_at: new Date().toISOString() }).eq("campaign_id", id).in("status", ["queued", "sending"]);
  }
  await audit(user.id, action, id, {});
  refresh(id);
  return {};
}

export async function pauseCampaignAction(id: string) { return setStatus(id, ["sending"], "paused", "campaign.paused"); }
export async function resumeCampaignAction(id: string) { return setStatus(id, ["paused"], "sending", "campaign.resumed"); }
export async function cancelCampaignAction(id: string) { return setStatus(id, ["sending", "paused"], "cancelled", "campaign.cancelled"); }

export async function requeueFailedAction(id: string): Promise<{ error?: string; message?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  if (!idSchema.safeParse(id).success) return { error: "Invalid campaign." };
  const n = await requeueFailed(id);
  await audit(user.id, "campaign.requeued_failed", id, { count: n });
  refresh(id);
  return { message: n === 0 ? "Nothing to retry." : `${n} re-queued. If an earlier attempt actually got through, those people may receive it twice.` };
}

const limitsSchema = z.object({ dailyCap: z.number().int().min(0).max(1_000_000), monthlyCap: z.number().int().min(0).max(100_000_000) });

/** The two sending budgets. Moving to a paid email plan = raising these. */
export async function saveLimitsAction(raw: { dailyCap: number; monthlyCap: number }): Promise<{ error?: string }> {
  const user = await gate();
  if (!user) return NOT_ADMIN;
  const parsed = limitsSchema.safeParse(raw);
  if (!parsed.success) return { error: "Enter whole numbers (0 or more)." };
  if (parsed.data.dailyCap > parsed.data.monthlyCap) return { error: "The daily limit can't be bigger than the monthly limit." };
  const admin = createAdminClient();
  const stamp = { updated_by: user.id, updated_at: new Date().toISOString() };
  const { error } = await admin.from("platform_settings").upsert(
    [
      { key: "marketing_daily_cap", value: parsed.data.dailyCap, ...stamp },
      { key: "marketing_monthly_cap", value: parsed.data.monthlyCap, ...stamp },
    ],
    { onConflict: "key" },
  );
  if (error) return { error: "Couldn't save the limits." };
  await audit(user.id, "campaign.limits_changed", null, parsed.data);
  refresh();
  return {};
}

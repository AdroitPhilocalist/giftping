import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { isOneSignalConfigured, sendPush } from "@/lib/integrations/onesignal";
import { isResendConfigured, sendEmail } from "@/lib/integrations/resend";
import { buildReminderEmail, occasionLabel } from "@/lib/diary/reminder-email";
import { dueReminders, localDateIn, milestoneYears } from "@/lib/diary/recurrence";
import { loadCandidatePool, type CandidatePool } from "@/lib/diary/candidates";
import { suggestGifts } from "@/lib/diary/suggestion-matcher";
import { formatCurrency } from "@/lib/utils/format";

/**
 * The daily diary reminder run (Vercel Cron -> /api/cron/diary-reminders).
 *
 * For every active diary event it works out what "today" is IN THE OWNER'S TIMEZONE, asks the pure `dueReminders()` which lead
 * times fall exactly today, and for each: writes an in-app notification and (if the owner allows it and Resend is configured) an
 * email carrying a few gift ideas.
 *
 * Exactly-once: before sending on a channel it CLAIMS a row in `diary_reminder_log` (unique on event + occurrence + lead time +
 * channel). If the claim conflicts, someone already sent it — so overlapping runs and manual re-runs never double-send. If an
 * email fails to send, its claim is released so the next run can retry.
 */
export interface ReminderRunSummary {
  eventsScanned: number;
  remindersDue: number;
  inAppSent: number;
  emailSent: number;
  emailSkippedNoProvider: number;
  emailSkippedOptOut: number;
  pushSent: number;
  pushNotSubscribed: number;
  pushSkippedOptOut: number;
  duplicatesSkipped: number;
  errors: number;
}

const PAGE = 500;

export async function runDiaryReminders(opts: { now?: Date; appUrl: string; dryRun?: boolean }): Promise<ReminderRunSummary> {
  const now = opts.now ?? new Date();
  const admin = createAdminClient();
  const summary: ReminderRunSummary = {
    eventsScanned: 0, remindersDue: 0, inAppSent: 0, emailSent: 0, emailSkippedNoProvider: 0, emailSkippedOptOut: 0, pushSent: 0, pushNotSubscribed: 0, pushSkippedOptOut: 0, duplicatesSkipped: 0, errors: 0,
  };

  let pool: CandidatePool | null = null;
  const loadPool = async () => (pool ??= await loadCandidatePool(admin));

  async function claim(eventId: string, userId: string, occurrence: string, daysBefore: number, channel: "in_app" | "email" | "push"): Promise<boolean> {
    const { data, error } = await admin
      .from("diary_reminder_log")
      .upsert(
        { event_id: eventId, user_id: userId, occurrence_date: occurrence, days_before: daysBefore, channel },
        { onConflict: "event_id,occurrence_date,days_before,channel", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw error;
    return Boolean(data && data.length > 0);
  }
  const release = (eventId: string, occurrence: string, daysBefore: number, channel: "in_app" | "email" | "push") =>
    admin.from("diary_reminder_log").delete().eq("event_id", eventId).eq("occurrence_date", occurrence).eq("days_before", daysBefore).eq("channel", channel);

  for (let offset = 0; ; offset += PAGE) {
    const { data: events, error } = await admin
      .from("diary_events")
      .select(
        `id, user_id, contact_id, event_type, title, event_date, is_recurring, reminder_days,
         contact:diary_contacts!inner ( name, relationship, interests, gift_preferences, budget_max ),
         owner:users!inner ( email, full_name, timezone, deleted_at, anonymized_at )`,
      )
      .eq("is_active", true)
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (error) throw error;
    if (!events || events.length === 0) break;
    summary.eventsScanned += events.length;

    // Which of this page's events are due today (in their owner's timezone)?
    const due = events.flatMap((event) => {
      const owner = Array.isArray(event.owner) ? event.owner[0] : event.owner;
      const contact = Array.isArray(event.contact) ? event.contact[0] : event.contact;
      if (!owner || !contact || owner.deleted_at || owner.anonymized_at) return [];
      const today = localDateIn(owner.timezone, now);
      return dueReminders({ eventDate: event.event_date, isRecurring: event.is_recurring, reminderDays: event.reminder_days, today }).map((d) => ({ event, owner, contact, ...d }));
    });
    summary.remindersDue += due.length;
    if (due.length === 0) {
      if (events.length < PAGE) break;
      continue;
    }

    const userIds = Array.from(new Set(due.map((d) => d.event.user_id)));
    const contactIds = Array.from(new Set(due.map((d) => d.event.contact_id)));
    const [{ data: prefs }, { data: gifts }] = await Promise.all([
      admin.from("notification_preferences").select("user_id, email_enabled, push_enabled").eq("category", "diary_reminders").in("user_id", userIds),
      admin.from("gift_history").select("contact_id, product_id, item:order_items(product_id)").in("contact_id", contactIds),
    ]);
    const emailAllowed = new Map((prefs ?? []).map((p) => [p.user_id, p.email_enabled]));
    const pushAllowed = new Map((prefs ?? []).map((p) => [p.user_id, p.push_enabled]));
    const giftedByContact = new Map<string, Set<string>>();
    for (const g of gifts ?? []) {
      const item = Array.isArray(g.item) ? g.item[0] : g.item;
      for (const pid of [g.product_id, item?.product_id]) {
        if (!pid || !g.contact_id) continue;
        const set = giftedByContact.get(g.contact_id) ?? new Set<string>();
        set.add(pid);
        giftedByContact.set(g.contact_id, set);
      }
    }

    for (const d of due) {
      try {
        const years = milestoneYears(d.event.event_date, d.occurrence);
        const label = occasionLabel({ contactName: d.contact.name, eventType: d.event.event_type, eventTitle: d.event.title, milestoneYears: years });
        const when = d.daysBefore === 1 ? "tomorrow" : `in ${d.daysBefore} days`;

        if (opts.dryRun) continue;

        // ---- in-app
        if (await claim(d.event.id, d.event.user_id, d.occurrence, d.daysBefore, "in_app")) {
          const { error: notifyError } = await admin.from("notifications").insert({
            user_id: d.event.user_id,
            title: `${label} is ${when}`,
            message: "Tap to see gift ideas picked for them.",
            type: "diary_reminder",
            link_url: "/diary",
            metadata: { event_id: d.event.id, occurrence: d.occurrence, days_before: d.daysBefore } as never,
          });
          if (notifyError) {
            await release(d.event.id, d.occurrence, d.daysBefore, "in_app");
            throw notifyError;
          }
          summary.inAppSent += 1;
        } else summary.duplicatesSkipped += 1;

        // ---- push (its own claim, like every channel). "Not subscribed" is a normal answer — the claim is kept so we don't retry all day;
        // only a genuine failure releases it for the next run.
        if (pushAllowed.get(d.event.user_id) === false) summary.pushSkippedOptOut += 1;
        else if (isOneSignalConfigured() && (await claim(d.event.id, d.event.user_id, d.occurrence, d.daysBefore, "push"))) {
          const result = await sendPush({ userId: d.event.user_id, title: `${label} is ${when}`, message: "Tap to see gift ideas picked for them.", url: `${opts.appUrl}/diary` });
          if (result === "sent") summary.pushSent += 1;
          else if (result === "not_subscribed") summary.pushNotSubscribed += 1;
          else {
            await release(d.event.id, d.occurrence, d.daysBefore, "push");
            summary.errors += 1;
          }
        }

        // ---- email
        if (emailAllowed.get(d.event.user_id) === false) {
          summary.emailSkippedOptOut += 1;
          continue;
        }
        if (!isResendConfigured() || !d.owner.email) {
          summary.emailSkippedNoProvider += 1;
          continue;
        }
        if (!(await claim(d.event.id, d.event.user_id, d.occurrence, d.daysBefore, "email"))) {
          summary.duplicatesSkipped += 1;
          continue;
        }

        const ideas = suggestGifts({
          person: { relationship: d.contact.relationship, interests: d.contact.interests ?? [], giftPreferences: d.contact.gift_preferences },
          context: { eventType: d.event.event_type, budgetMax: d.contact.budget_max === null ? null : Number(d.contact.budget_max) },
          candidates: (await loadPool()).candidates,
          alreadyGiftedProductIds: giftedByContact.get(d.event.contact_id),
          limit: 3,
        });
        const byId = (await loadPool()).byId;
        const email = buildReminderEmail({
          recipientFirstName: (d.owner.full_name ?? "there").split(" ")[0],
          contactName: d.contact.name,
          eventType: d.event.event_type,
          eventTitle: d.event.title,
          daysBefore: d.daysBefore,
          occurrence: d.occurrence,
          milestoneYears: years,
          suggestions: ideas.map((s) => ({
            name: byId.get(s.productId)!.name,
            priceLabel: formatCurrency(byId.get(s.productId)!.price),
            url: `${opts.appUrl}/products/${byId.get(s.productId)!.slug}`,
            reason: s.reasons[0] ?? "A thoughtful pick",
          })),
          diaryUrl: `${opts.appUrl}/diary`,
          preferencesUrl: `${opts.appUrl}/account/notifications`,
        });
        const sent = await sendEmail({ to: d.owner.email, ...email });
        if (sent.ok) summary.emailSent += 1;
        else if (sent.notConfigured) {
          await release(d.event.id, d.occurrence, d.daysBefore, "email"); // Resend still in test mode: retry once the domain is verified
          summary.emailSkippedNoProvider += 1;
        } else {
          await release(d.event.id, d.occurrence, d.daysBefore, "email"); // so the next run can try again
          summary.errors += 1;
          console.error("Diary reminder email failed", d.event.id, sent.error);
        }
      } catch (error) {
        summary.errors += 1;
        console.error("Diary reminder failed", d.event.id, error);
      }
    }
    if (events.length < PAGE) break;
  }
  return summary;
}

import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { sendPush } from "@/lib/integrations/onesignal";
import { sendEmail } from "@/lib/integrations/resend";
import type { BuiltEmail } from "@/lib/notifications/email-layout";

/**
 * The one way the app tells a user something: an in-app notification (always) plus an optional email, gated by that user's
 * notification preferences. It NEVER throws — a failed notification must not fail a payment webhook, a courier update or a
 * dispatch — it logs and reports what happened instead.
 *
 * Push (OneSignal web push) is sent to every notification unless `push: false` or the user switched the category's push off; a user with no
 * subscribed browser is simply skipped. Email rules: sent only if the user hasn't switched that category off (no preference row = on), they have a real address and
 * haven't been deleted/anonymised, and Resend is configured. (Until a sending domain is verified, Resend itself will refuse any
 * address but the account owner's — that shows up as `failed`, never as a crash.)
 */
export type NotificationCategory = "order_updates" | "diary_reminders" | "promotions" | "vendor_updates" | "wishlist_alerts";

export type EmailOutcome = "none" | "sent" | "skipped_optout" | "skipped_no_provider" | "skipped_no_address" | "failed";
export type PushChannelOutcome = "sent" | "not_subscribed" | "skipped_optout" | "skipped_no_provider" | "skipped" | "failed";

export interface NotifyArgs {
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  metadata?: Record<string, unknown>;
  email?: BuiltEmail;
  /** Set false for messages that shouldn't also buzz a phone. Default: push too. */
  push?: boolean;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function notifyUser(args: NotifyArgs): Promise<{ inApp: boolean; email: EmailOutcome; push: PushChannelOutcome }> {
  const admin = createAdminClient();
  let inApp = false;
  try {
    const { error } = await admin.from("notifications").insert({
      user_id: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      link_url: args.linkUrl ?? null,
      metadata: (args.metadata ?? {}) as never,
    });
    if (error) throw error;
    inApp = true;
  } catch (error) {
    console.error("In-app notification failed", args.type, error);
  }

  const wantsPush = args.push !== false;
  if (!args.email && !wantsPush) return { inApp, email: "none", push: "skipped" };

  let email: EmailOutcome = args.email ? "failed" : "none";
  let push: PushChannelOutcome = wantsPush ? "failed" : "skipped";
  try {
    const [{ data: pref }, { data: user }] = await Promise.all([
      admin.from("notification_preferences").select("email_enabled, push_enabled").eq("user_id", args.userId).eq("category", args.category).maybeSingle(),
      admin.from("users").select("email, deleted_at, anonymized_at").eq("id", args.userId).maybeSingle(),
    ]);
    const gone = !user || user.deleted_at || user.anonymized_at;

    if (args.email) {
      if (pref?.email_enabled === false) email = "skipped_optout";
      else if (gone || !user?.email) email = "skipped_no_address";
      else {
        const sent = await sendEmail({ to: user.email, ...args.email });
        email = sent.ok ? "sent" : sent.notConfigured ? "skipped_no_provider" : "failed";
        if (email === "failed") console.error("Notification email failed", args.type, !sent.ok && sent.error);
      }
    }
    if (wantsPush) {
      if (pref?.push_enabled === false) push = "skipped_optout";
      else if (gone) push = "skipped";
      else {
        const result = await sendPush({ userId: args.userId, title: args.title, message: args.message, url: `${appBaseUrl()}${args.linkUrl && args.linkUrl.startsWith("/") ? args.linkUrl : "/notifications"}` });
        push = result === "not_configured" ? "skipped_no_provider" : result;
      }
    }
  } catch (error) {
    console.error("Notification delivery failed", args.type, error);
  }
  return { inApp, email, push };
}

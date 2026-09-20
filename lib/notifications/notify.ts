import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { sendEmail } from "@/lib/integrations/resend";
import type { BuiltEmail } from "@/lib/notifications/email-layout";

/**
 * The one way the app tells a user something: an in-app notification (always) plus an optional email, gated by that user's
 * notification preferences. It NEVER throws — a failed notification must not fail a payment webhook, a courier update or a
 * dispatch — it logs and reports what happened instead.
 *
 * Email rules: sent only if the user hasn't switched that category off (no preference row = on), they have a real address and
 * haven't been deleted/anonymised, and Resend is configured. (Until a sending domain is verified, Resend itself will refuse any
 * address but the account owner's — that shows up as `failed`, never as a crash.)
 */
export type NotificationCategory = "order_updates" | "diary_reminders" | "promotions" | "vendor_updates" | "wishlist_alerts";

export type EmailOutcome = "none" | "sent" | "skipped_optout" | "skipped_no_provider" | "skipped_no_address" | "failed";

export interface NotifyArgs {
  userId: string;
  category: NotificationCategory;
  type: string;
  title: string;
  message: string;
  linkUrl?: string | null;
  metadata?: Record<string, unknown>;
  email?: BuiltEmail;
}

export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function notifyUser(args: NotifyArgs): Promise<{ inApp: boolean; email: EmailOutcome }> {
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
  if (!args.email) return { inApp, email: "none" };

  try {
    const [{ data: pref }, { data: user }] = await Promise.all([
      admin.from("notification_preferences").select("email_enabled").eq("user_id", args.userId).eq("category", args.category).maybeSingle(),
      admin.from("users").select("email, deleted_at, anonymized_at").eq("id", args.userId).maybeSingle(),
    ]);
    if (pref?.email_enabled === false) return { inApp, email: "skipped_optout" };
    if (!user?.email || user.deleted_at || user.anonymized_at) return { inApp, email: "skipped_no_address" };

    const sent = await sendEmail({ to: user.email, ...args.email });
    if (sent.ok) return { inApp, email: "sent" };
    if (sent.notConfigured) return { inApp, email: "skipped_no_provider" };
    console.error("Notification email failed", args.type, sent.error);
    return { inApp, email: "failed" };
  } catch (error) {
    console.error("Notification email failed", args.type, error);
    return { inApp, email: "failed" };
  }
}

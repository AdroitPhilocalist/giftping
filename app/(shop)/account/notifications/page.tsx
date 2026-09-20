import Link from "next/link";
import { NotificationToggle } from "@/components/shop/NotificationToggle";
import { PushControls } from "@/components/shop/PushControls";
import { NOTIFICATION_CATEGORIES } from "@/lib/account/notification-categories";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Notification settings — GiftPing" };

export default async function NotificationSettingsPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const { data } = await (await createClient()).from("notification_preferences").select("category, email_enabled, push_enabled").eq("user_id", user.id);
  const prefs = new Map((data ?? []).map((p) => [p.category, p]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Link href="/account" className="text-sm text-brand-dark/60 hover:underline">← My Account</Link>
      <h1 className="mt-2 font-heading text-3xl text-brand-dark">Notification settings</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Choose which emails you&apos;d like. You&apos;ll always see updates inside GiftPing, and order emails about payments and delivery are important — keep those on.</p>
      <PushControls />
      <ul className="mt-6 divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-white">
        {NOTIFICATION_CATEGORIES.map((c) => (
          <NotificationToggle key={c.key} category={c.key} label={c.label} hint={c.hint} initialEmail={prefs.get(c.key)?.email_enabled ?? true} initialPush={prefs.get(c.key)?.push_enabled ?? true} />
        ))}
      </ul>
    </div>
  );
}

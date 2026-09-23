import Link from "next/link";
import { Robin } from "@/components/art/Robin";
import { MarkAllReadButton } from "@/components/shop/MarkAllReadButton";
import { NotificationItem } from "@/components/shop/NotificationItem";
import { requireRole } from "@/lib/auth/session";
import { getNotifications } from "@/lib/db/notifications";

export const metadata = { title: "Notifications — GiftPing" };

export default async function NotificationsPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const items = await getNotifications(user.id);
  const unread = items.filter((i) => !i.is_read).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl text-brand-dark">Notifications</h1>
        {unread > 0 ? <MarkAllReadButton /> : null}
      </div>
      {items.length === 0 ? (
        <div className="mt-8 flex flex-col items-center gap-2 rounded-card border border-dashed border-brand-dark/15 p-14 text-center">
          <Robin pose="bell" className="w-28" />
          <p className="text-sm text-brand-dark/60">Nothing yet — order updates and diary reminders will appear here.</p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
          {items.map((item) => <NotificationItem key={item.id} item={item} />)}
        </ul>
      )}
      <p className="mt-4 text-center text-xs text-brand-dark/50">
        <Link href="/account/notifications" className="underline">Email notification settings</Link>
      </p>
    </div>
  );
}

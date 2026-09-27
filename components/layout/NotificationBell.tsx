"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, Gift } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { OccasionSticker } from "@/components/diary/art/OccasionSticker";
import { markAllNotificationsReadAction, markNotificationReadAction, recentNotificationsAction } from "@/lib/account/inbox-actions";
import { cn } from "@/lib/utils/cn";

interface BellItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  metadata: unknown;
}

const iconButton = "relative rounded-full p-2 text-brand-on-primary/85 transition-colors duration-300 hover:bg-brand-on-primary/12 hover:text-brand-on-primary";
const badge = "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2 ring-brand-primary";

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const sameSite = (url: string | null) => (url && url.startsWith("/") && !url.startsWith("//") ? url : null);

/**
 * The bell: a dropdown of the latest few notifications (diary reminders wear their occasion's sticker), with "Mark all as read" and a way to the full
 * inbox. The link itself still goes to /notifications, so it works without JavaScript and for anyone who wants the whole list.
 */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) startTransition(async () => setItems((await recentNotificationsAction()) as BellItem[]));
  }
  const visit = (item: BellItem) => {
    const target = sameSite(item.link_url);
    startTransition(async () => {
      if (!item.is_read) await markNotificationReadAction(item.id);
      router.push(target ?? "/notifications");
      router.refresh();
    });
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} className={iconButton}>
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? <span className={`${badge} bg-red-600 text-white`}>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={10} collisionPadding={12} className="gp-menu-pop paper z-50 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-card border border-brand-secondary/30 shadow-lift focus:outline-none">
          <div className="flex items-center justify-between gap-3 border-b border-brand-secondary/20 px-4 py-3">
            <p className="font-heading text-lg italic text-brand-dark">Notifications</p>
            {unreadCount > 0 ? (
              <button type="button" className="text-xs text-brand-secondary-dark underline underline-offset-2 hover:text-brand-secondary" onClick={() => startTransition(async () => { await markAllNotificationsReadAction(); setItems((cur) => cur?.map((i) => ({ ...i, is_read: true })) ?? cur); router.refresh(); })}>
                Mark all as read
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(24rem,60vh)] divide-y divide-brand-secondary/15 overflow-y-auto">
            {items === null ? (
              <li className="px-4 py-6 text-center text-sm text-brand-dark/50">Opening your notifications…</li>
            ) : items.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-brand-dark/60">Nothing yet — order updates and diary reminders will appear here.</li>
            ) : (
              items.map((item) => {
                const occasion = item.type === "diary_reminder" ? ((item.metadata as { event_type?: unknown } | null)?.event_type as string | undefined) ?? "other" : null;
                return (
                  <li key={item.id}>
                    <DropdownMenu.Item onSelect={() => visit(item)} className={cn("flex cursor-pointer items-start gap-3 px-4 py-3 outline-none transition-colors data-[highlighted]:bg-brand-accent/60", !item.is_read && "bg-brand-primary/5")}>
                      {occasion ? <OccasionSticker type={occasion} className="mt-0.5 h-9 w-9 shrink-0" /> : <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark"><Gift className="h-4 w-4" aria-hidden="true" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm text-brand-dark", !item.is_read && "font-medium")}>{item.title}</span>
                        <span className="block text-xs text-brand-dark/60">{item.message}</span>
                        <span className="mt-0.5 block text-[11px] text-brand-dark/40">{ago(item.created_at)}</span>
                      </span>
                      {!item.is_read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-secondary" aria-label="Unread" /> : null}
                    </DropdownMenu.Item>
                  </li>
                );
              })
            )}
          </ul>
          <div className="border-t border-brand-secondary/20 px-4 py-2.5 text-center">
            <DropdownMenu.Item asChild>
              <Link href="/notifications" className="inline-flex items-center gap-1.5 text-sm text-brand-secondary-dark outline-none hover:underline data-[highlighted]:underline">View all reminders →</Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

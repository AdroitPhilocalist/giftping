"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowRight, Bell, CheckCheck, Settings2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Robin } from "@/components/art/Robin";
import { OccasionSticker } from "@/components/diary/art/OccasionSticker";
import { diaryOccasion, notificationAgo, notificationVisual } from "@/components/notifications/notificationVisual";
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
const badge =
  "absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none tabular-nums shadow-sm ring-2 ring-brand-primary";

/** The row's shared shape. Inset and rounded, so the panel reads as a tray of slips rather than a table with full-bleed rules. */
const rowClass =
  "group relative flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2.5 outline-none transition-colors data-[highlighted]:bg-brand-accent/70";

const sameSite = (url: string | null) => (url && url.startsWith("/") && !url.startsWith("//") ? url : null);

/**
 * The bell: a small tray of the latest notifications, with "Mark all as read", the way to the full inbox, and a way to reach the
 * settings that decide what arrives here. The bell itself is still an anchor's worth of information — the trigger's label carries
 * the unread count, and /notifications remains a plain page for anyone without JavaScript.
 *
 * Three states the old panel didn't have: a skeleton while it opens, a real empty state (the robin, not a sentence in the middle
 * of nothing), and an error state with a retry, because `recentNotificationsAction` can throw and the panel used to sit on
 * "Opening your notifications…" forever.
 */
export function NotificationBell({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BellItem[] | null>(null);
  const [failed, setFailed] = useState(false);
  // How many unread the reader has cleared optimistically. A subtraction, not a hard zero: if a new notification lands before
  // the server's refreshed count arrives, the badge shows the new one instead of staying hidden for the rest of the session.
  const [dismissed, setDismissed] = useState(0);
  const lastCount = useRef(unreadCount);
  const [marking, setMarking] = useState(false);
  const [, startTransition] = useTransition();

  const unread = Math.max(0, unreadCount - dismissed);

  useEffect(() => {
    if (lastCount.current !== unreadCount) {
      lastCount.current = unreadCount;
      setDismissed(0); // the server has spoken; stop subtracting an old clear
    }
  }, [unreadCount]);

  async function load() {
    setFailed(false);
    try {
      setItems((await recentNotificationsAction()) as BellItem[]);
    } catch {
      setItems([]);
      setFailed(true);
    }
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) startTransition(load);
  }

  function markAll() {
    if (marking) return;
    // Clear first, then persist: waiting on the round-trip left the badge and every dot sitting there for a beat after the click.
    const before = items;
    const previousDismissed = dismissed;
    setMarking(true);
    setDismissed(unreadCount);
    setItems((current) => current?.map((item) => ({ ...item, is_read: true })) ?? current);
    startTransition(async () => {
      try {
        await markAllNotificationsReadAction();
        // A refresh that landed mid-request could have re-introduced read rows; settle them again after the write.
        setItems((current) => current?.map((item) => ({ ...item, is_read: true })) ?? current);
        router.refresh();
      } catch {
        // put the tray back the way it was rather than pretending it worked
        setDismissed(previousDismissed);
        if (before) setItems(before);
        else void load();
      } finally {
        setMarking(false);
      }
    });
  }

  const visit = (item: BellItem) => {
    const target = sameSite(item.link_url);
    startTransition(async () => {
      try {
        if (!item.is_read) await markNotificationReadAction(item.id);
      } catch {
        // the row stays unread, but the notification's link still works
      }
      router.push(target ?? "/notifications");
      router.refresh();
    });
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={onOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
          className={cn(iconButton, "group")}
        >
          <Bell className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-6" />
          {unread > 0 ? (
            <span key={unread} className={cn(badge, "gp-badge-pop bg-red-600 text-white")} aria-hidden="true">
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={12}
          collisionPadding={12}
          aria-label="Notifications"
          className="gp-menu-pop z-50 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.4rem] border border-brand-dark/[0.07] bg-brand-surface shadow-lift focus:outline-none"
        >
          {/* the header band: warm enough to separate itself from the slips below, quiet enough not to shout */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 bg-gradient-to-r from-brand-accent via-brand-accent/70 to-brand-accent/35 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-secondary/15 text-brand-secondary-dark">
                <Bell className="h-3.5 w-3.5" />
              </span>
              <p className="truncate font-heading text-[1.15rem] leading-none text-brand-dark">Notifications</p>
              {unread > 0 ? (
                <span className="shrink-0 rounded-full bg-brand-secondary/15 px-1.5 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-brand-secondary-dark">
                  {unread} unread
                </span>
              ) : null}
            </div>
            {unread > 0 && items && items.length > 0 ? (
              <DropdownMenu.Item
                onSelect={(event) => {
                  event.preventDefault(); // keep the tray open while the rows settle to "read"
                  markAll();
                }}
                className="ml-auto flex shrink-0 cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-brand-secondary-dark outline-none transition-colors data-[highlighted]:bg-brand-surface/80"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Mark all as read
              </DropdownMenu.Item>
            ) : null}
          </div>

          <div className="p-2">
            {items === null && !failed ? (
              <div className="space-y-1">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-start gap-3 rounded-2xl px-3 py-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-brand-accent" />
                    <div className="flex-1 space-y-2 py-1.5">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-brand-accent" />
                      <div className="h-2.5 w-full animate-pulse rounded-full bg-brand-accent/70" />
                      <div className="h-2 w-1/3 animate-pulse rounded-full bg-brand-accent/50" />
                    </div>
                  </div>
                ))}
                <span role="status" className="sr-only">
                  Loading notifications
                </span>
              </div>
            ) : failed ? (
              <div className="px-4 py-7 text-center">
                <p className="text-sm text-brand-dark/70">Couldn&apos;t open your notifications just now.</p>
                <DropdownMenu.Item
                  onSelect={(event) => {
                    event.preventDefault();
                    setItems(null);
                    startTransition(load);
                  }}
                  className="mx-auto mt-3 flex w-fit cursor-pointer items-center gap-1 rounded-full border border-brand-dark/10 px-3 py-1.5 text-xs font-medium text-brand-secondary-dark outline-none transition-colors data-[highlighted]:bg-brand-accent/70"
                >
                  Try again
                </DropdownMenu.Item>
              </div>
            ) : !items || items.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <Robin pose="bell" title="" className="mx-auto w-20" />
                <p className="mx-auto mt-3 max-w-[15rem] text-sm leading-relaxed text-brand-dark/60">
                  Nothing yet — order updates and diary reminders will appear here.
                </p>
              </div>
            ) : (
              <div role="group" aria-label="Latest notifications" className="gp-scroll-thin max-h-[min(33rem,calc(100vh-15rem))] space-y-1 overflow-y-auto overscroll-contain">
                {items.map((item) => {
                  const occasion = diaryOccasion(item);
                  const visual = notificationVisual(item.type);
                  const Icon = visual.icon;
                  return (
                    <DropdownMenu.Item
                      key={item.id}
                      onSelect={() => visit(item)}
                      className={cn(rowClass, !item.is_read && "bg-brand-accent/35")}
                    >
                      {occasion ? (
                        <span className="mt-0.5 shrink-0" aria-hidden="true">
                          <OccasionSticker type={occasion} className="h-10 w-10" />
                        </span>
                      ) : (
                        <span aria-hidden="true" className={cn("mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full", visual.roundel)}>
                          <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2.5">
                          <span className={cn("line-clamp-2 min-w-0 flex-1 text-[13.5px] leading-snug text-brand-dark", item.is_read ? "font-medium" : "font-semibold")}>
                            {!item.is_read ? <span className="sr-only">Unread: </span> : null}
                            {item.title}
                          </span>
                          {!item.is_read ? (
                            <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-secondary ring-4 ring-brand-secondary/15" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-brand-dark/60">{item.message}</span>
                        <span className="mt-1 block text-[11px] text-brand-dark/65">{notificationAgo(item.created_at)}</span>
                      </span>
                    </DropdownMenu.Item>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 border-t border-brand-dark/[0.06] p-2">
            <DropdownMenu.Item asChild>
              <Link
                href="/notifications"
                className="flex flex-1 items-center justify-between rounded-xl px-2.5 py-2 text-sm font-medium text-brand-secondary-dark outline-none transition-colors data-[highlighted]:bg-brand-accent/70"
              >
                Open inbox
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Item asChild>
              <Link
                href="/account/notifications"
                aria-label="Notification settings"
                title="Notification settings"
                className="grid h-9 w-9 place-items-center rounded-xl text-brand-dark/55 outline-none transition-colors data-[highlighted]:bg-brand-accent/70 data-[highlighted]:text-brand-dark"
              >
                <Settings2 className="h-4 w-4" aria-hidden="true" />
              </Link>
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationReadAction } from "@/lib/account/inbox-actions";
import { OccasionSticker } from "@/components/diary/art/OccasionSticker";
import { diaryOccasion, notificationAgo, notificationVisual } from "@/components/notifications/notificationVisual";
import { cn } from "@/lib/utils/cn";

export interface InboxItem {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
  type?: string;
  metadata?: unknown;
}

/**
 * One row of the full inbox — the bell panel's row at a wider measure. Both share `notificationVisual`, so an order wears the same
 * parcel in the tray and on the page; the page keeps the whole message rather than clamping it, since reading it is the point.
 */
export function NotificationItem({ item }: { item: InboxItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Only same-site paths are followed: a notification's link is data, and data doesn't get to send people elsewhere.
  const target = item.link_url && item.link_url.startsWith("/") && !item.link_url.startsWith("//") ? item.link_url : null;
  const occasion = diaryOccasion(item);
  const visual = notificationVisual(item.type);
  const Icon = visual.icon;

  return (
    <li>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            try {
              if (!item.is_read) await markNotificationReadAction(item.id);
            } catch {
              // still take the reader where the row points
            }
            if (target) router.push(target);
            else router.refresh();
          })
        }
        className={cn(
          "flex w-full items-start gap-3.5 p-4 text-left transition-colors hover:bg-brand-accent/40 disabled:opacity-70",
          !item.is_read && "bg-brand-accent/25",
        )}
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
            <span className={cn("min-w-0 flex-1 text-sm leading-snug text-brand-dark", item.is_read ? "font-medium" : "font-semibold")}>
              {!item.is_read ? <span className="sr-only">Unread: </span> : null}
              {item.title}
            </span>
            {!item.is_read ? (
              <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-secondary ring-4 ring-brand-secondary/15" />
            ) : null}
          </span>
          <span className="mt-0.5 block text-[13px] leading-relaxed text-brand-dark/60">{item.message}</span>
          <span className="mt-1 block text-[11px] text-brand-dark/65">{notificationAgo(item.created_at)}</span>
        </span>
      </button>
    </li>
  );
}

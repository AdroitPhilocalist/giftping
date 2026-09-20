"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markNotificationReadAction } from "@/lib/account/inbox-actions";
import { cn } from "@/lib/utils/cn";

export interface InboxItem {
  id: string;
  title: string;
  message: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

function ago(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationItem({ item }: { item: InboxItem }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Only same-site paths are followed: a notification's link is data, and data doesn't get to send people elsewhere.
  const target = item.link_url && item.link_url.startsWith("/") && !item.link_url.startsWith("//") ? item.link_url : null;

  return (
    <li>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            if (!item.is_read) await markNotificationReadAction(item.id);
            if (target) router.push(target);
            else router.refresh();
          })
        }
        className={cn("flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-brand-accent/40", !item.is_read && "bg-brand-primary/5")}
      >
        <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", item.is_read ? "bg-transparent" : "bg-brand-secondary")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-sm text-brand-dark", !item.is_read && "font-medium")}>{item.title}</span>
          <span className="block text-sm text-brand-dark/60">{item.message}</span>
          <span className="mt-0.5 block text-xs text-brand-dark/40">{ago(item.created_at)}</span>
        </span>
        {!item.is_read ? <span className="sr-only">Unread</span> : null}
      </button>
    </li>
  );
}

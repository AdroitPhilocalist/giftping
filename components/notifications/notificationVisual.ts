import type { LucideIcon } from "lucide-react";
import { Banknote, Bell, Download, Megaphone, Package, RotateCcw, Sparkles, Star, Store, Truck, Wallet } from "lucide-react";

/**
 * How a notification type presents itself: which icon sits in the roundel, and which warm tint that roundel gets. One mapping, used
 * by the header's bell panel and by the full inbox, so an order update never wears a different mark in the two places.
 *
 * Types are plain strings written by `notifyUser` all over the app (`vendor_new_order`, `shipment_rto`, `return_approved`…), so this
 * matches on shape rather than keeping an exhaustive list that would silently fall behind. Everything unknown gets the bell.
 *
 * Tints are brand tokens only: a notification is not an error, so it has no business borrowing the danger red.
 */
export interface NotificationVisual {
  icon: LucideIcon;
  /** Tailwind classes for the roundel behind the icon. */
  roundel: string;
}

/** The default warm peach roundel — orders, reminders, greetings. */
const WARM = "bg-brand-accent text-brand-secondary-dark";
/** Deep green: money moving, and the decisions a vendor cares about. */
const INK = "bg-brand-primary/[0.07] text-brand-primary";
/** Copper: returns and refunds, which need a second look rather than alarm. */
const COPPER = "bg-brand-secondary/[0.12] text-brand-secondary-dark";

const RULES: Array<{ match: RegExp; icon: LucideIcon; roundel: string }> = [
  // money back before returns, and both before orders: `vendor_return_requested` is a return, not an order
  { match: /refund/i, icon: Banknote, roundel: COPPER },
  { match: /return/i, icon: RotateCcw, roundel: COPPER },
  { match: /^shipment|^courier/i, icon: Truck, roundel: WARM },
  { match: /^payout|settlement/i, icon: Wallet, roundel: INK },
  { match: /vendor_approved|vendor_reinstated|vendor_suspended|vendor_rejected|vendor_branding|^admin_vendor/i, icon: Store, roundel: INK },
  { match: /^order|_order|cancel/i, icon: Package, roundel: WARM },
  { match: /^review/i, icon: Star, roundel: WARM },
  { match: /^welcome/i, icon: Sparkles, roundel: WARM },
  { match: /^data_export|^export/i, icon: Download, roundel: WARM },
  { match: /message|^admin_/i, icon: Megaphone, roundel: WARM },
];

export function notificationVisual(type: string | null | undefined): NotificationVisual {
  if (type) {
    for (const rule of RULES) {
      if (rule.match.test(type)) return { icon: rule.icon, roundel: rule.roundel };
    }
  }
  return { icon: Bell, roundel: WARM };
}

/** How long ago, in the one shape both the bell and the inbox use. */
export function notificationAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  if (seconds < 86400 * 7) return `${Math.floor(seconds / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** The occasion a diary reminder is about (set by the reminder run), so it can wear its sticker instead of a generic icon. */
export function diaryOccasion(item: { type?: string | null; metadata?: unknown }): string | null {
  if (item.type !== "diary_reminder") return null;
  const type = (item.metadata as { event_type?: unknown } | null)?.event_type;
  return typeof type === "string" ? type : "other";
}

// Kept out of notification-actions.ts: a "use server" file may only export async functions.
export const NOTIFICATION_CATEGORIES = [
  { key: "diary_reminders", label: "Diary reminders", hint: "A heads-up before the birthdays and anniversaries you've saved, with gift ideas." },
  { key: "order_updates", label: "Order updates", hint: "Payment, packing and delivery updates for your orders." },
  { key: "wishlist_alerts", label: "Wishlist price drops", hint: "A note when something you've saved gets cheaper — at most one message per item a week." },
] as const;

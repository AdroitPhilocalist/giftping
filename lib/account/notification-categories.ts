// Kept out of notification-actions.ts: a "use server" file may only export async functions.
export const NOTIFICATION_CATEGORIES = [
  { key: "diary_reminders", label: "Diary reminders", hint: "A heads-up before the birthdays and anniversaries you've saved, with gift ideas." },
  { key: "order_updates", label: "Order updates", hint: "Payment, packing and delivery updates for your orders." },
  { key: "promotions", label: "Offers & new arrivals", hint: "Occasional offers from GiftPing and its boutiques." },
] as const;

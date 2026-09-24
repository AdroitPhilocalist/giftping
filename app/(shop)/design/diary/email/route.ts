import { notFound } from "next/navigation";
import { buildReminderEmail } from "@/lib/diary/reminder-email";

/** Development-only preview of the diary reminder email over sample data (404s in production): /design/diary/email */
export function GET(request: Request) {
  if (process.env.NODE_ENV === "production") notFound();
  const origin = new URL(request.url).origin;
  const { html } = buildReminderEmail({
    recipientFirstName: "Priya",
    contactName: "Mom",
    eventType: "birthday",
    eventTitle: null,
    daysBefore: 7,
    occurrence: "2026-10-03",
    milestoneYears: 60,
    suggestions: [
      { name: "Jasmine Scented Candle", priceLabel: "₹1,299", url: `${origin}/products/x`, reason: "Loves candles and flowers", imageUrl: `${origin}/seed-images/candle-trio.webp` },
      { name: "Handwoven Silk Saree", priceLabel: "₹3,499", url: `${origin}/products/x`, reason: "Matches: sarees", imageUrl: `${origin}/seed-images/silk-scarf.webp` },
      { name: "Luxury Self-Care Hamper", priceLabel: "₹2,799", url: `${origin}/products/x`, reason: "Within her usual budget", imageUrl: `${origin}/seed-images/hamper.webp` },
    ],
    lastYear: { giftName: "a handwoven silk scarf", imageUrl: `${origin}/seed-images/silk-scarf.webp` },
    diaryUrl: `${origin}/diary`,
    preferencesUrl: `${origin}/account/notifications`,
    robinUrl: `${origin}/email/robin.png`,
  });
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}

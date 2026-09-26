import { buildDiaryView, type DiaryContactRow, type DiaryEventRow, type DiaryGiftRow } from "@/lib/diary/view";
import type { GiftingScore } from "@/lib/diary/gifting-score";
import { toCalendarMarks, toMomentCard, toPersonCards } from "@/lib/diary/page-data";
import type { IdeaCardData } from "@/lib/diary/ui-types";
import type { CandidatePool } from "@/lib/diary/candidates";
import type { DiaryPlanRow } from "@/lib/diary/plans";
import type { DiaryRows } from "@/lib/db/diary";
import type { TimelineGift } from "@/components/diary/person/GiftTimeline";
import type { PlanViewData } from "@/components/diary/person/PlanSheet";

// Sample data that mirrors the approved reference screens (ui-references/diary/) so the design can be checked without signing in.
// Development only: the route that uses this 404s in production. The real diary pages build the same shapes from the user's own rows.
export const TODAY = "2026-09-24";

const c = (id: string, name: string, over: Partial<DiaryContactRow> = {}): DiaryContactRow => ({ id, name, relationship: null, interests: [], gift_preferences: null, notes: null, budget_max: null, is_favorite: false, tagline: null, photo_url: null, ...over });
const e = (id: string, contact_id: string, event_date: string, over: Partial<DiaryEventRow> = {}): DiaryEventRow => ({ id, contact_id, event_type: "birthday", title: null, event_date, is_recurring: true, reminder_days: [7, 3], is_active: true, notes: null, created_at: "2020-01-01T00:00:00Z", ...over });
const g = (id: string, contact_id: string, gifted_at: string, gift_name: string, over: Partial<DiaryGiftRow> = {}): DiaryGiftRow & { id: string } => ({ id, contact_id, gifted_at, gift_name, product_id: null, event_type: "birthday", amount: null, ...over });

export const CONTACTS: DiaryContactRow[] = [
  c("1", "Mom", { relationship: "Mother", is_favorite: true, tagline: "Always makes everyone feel special", budget_max: 2000, interests: ["jasmine flowers", "sarees", "filter coffee", "gardening"], notes: "She said she liked the jasmine candle at Nani's. Also mentioned she wants a lightweight silk saree in pastel shades. Maybe plan something with a handwritten note this time." }),
  c("2", "Dad", { relationship: "Father", interests: ["watches", "books"] }),
  c("3", "Arjun", { relationship: "Brother", interests: ["travel", "coffee"] }),
  c("4", "Nani", { relationship: "Grandparent" }),
  c("5", "Meera", { relationship: "Friend" }),
];
export const EVENTS: DiaryEventRow[] = [
  e("e1", "1", "1966-10-03"),
  e("e2", "1", "1990-12-02", { event_type: "anniversary" }),
  e("e3", "1", "2020-10-20", { event_type: "festival", title: "Diwali" }),
  e("e4", "2", "1962-10-12", { event_type: "anniversary" }),
  e("e5", "3", "1995-11-12", { event_type: "anniversary" }),
  e("e6", "4", "1948-11-24", { is_recurring: true }),
  e("e7", "5", "1992-12-30"),
];
export const GIFTS: (DiaryGiftRow & { id: string })[] = [
  g("g1", "1", "2025-09-20T10:00:00Z", "Wellness hamper", { image: "/seed-images/hamper.webp", notes: "She loved the teas and candles. Said it was so thoughtful." }),
  g("g2", "1", "2024-09-25T10:00:00Z", "Handwoven silk scarf", { image: "/seed-images/silk-scarf.webp", notes: "Her favourite colour. Wore it during last Diwali." }),
  g("g3", "1", "2023-09-28T10:00:00Z", "Brass diya lamp", { image: "/seed-images/brass-lamp.webp", event_type: "festival", notes: "She loved this! Still keeps it in the puja room." }),
  g("g4", "2", "2026-08-01T10:00:00Z", "Leather wallet", { image: "/seed-images/leather-wallet.webp", event_type: "anniversary" }),
];

export const VIEW = buildDiaryView({ contacts: CONTACTS, events: EVENTS, gifts: GIFTS, today: TODAY });
export const MOMENTS = VIEW.upcoming.map(toMomentCard);
export const PEOPLE = toPersonCards(CONTACTS, VIEW.nextByContact, new Map());
export const MARKS = toCalendarMarks(EVENTS, CONTACTS, TODAY);
export const OPTIONS = CONTACTS.map((x) => ({ id: x.id, name: x.name }));

export const IDEAS: IdeaCardData[] = [
  { productId: "p1", slug: "x", name: "Scented Candle Set", price: 1299, thumbnail: "/seed-images/candle-trio.webp", vendorName: null, reason: "Loves candles and flowers" },
  { productId: "p2", slug: "x", name: "Handwoven Silk Scarf", price: 2499, thumbnail: "/seed-images/silk-scarf.webp", vendorName: null, reason: "Matches: sarees" },
  { productId: "p3", slug: "x", name: "Wellness Hamper", price: 3199, thumbnail: "/seed-images/hamper.webp", vendorName: null, reason: "Within her usual budget" },
  { productId: "p4", slug: "x", name: "Brass Diya Set", price: 899, thumbnail: "/seed-images/brass-lamp.webp", vendorName: null, reason: "A festival favourite" },
  { productId: "p5", slug: "x", name: "Peony Bouquet", price: 1499, thumbnail: "/seed-images/peony-bouquet.webp", vendorName: null, reason: "Loves flowers" },
  { productId: "p6", slug: "x", name: "Jewellery Box", price: 1799, thumbnail: "/seed-images/jewellery-box.webp", vendorName: null, reason: null },
];

export const SCORE: GiftingScore = {
  score: 82,
  label: "Gifting pro",
  breakdown: [
    { key: "preparedness", label: "You remember important dates", points: 41, max: 45 },
    { key: "knowing", label: "You give meaningful gifts", points: 20, max: 25 },
    { key: "coverage", label: "Dates saved for everyone", points: 15, max: 15 },
    { key: "consistency", label: "You keep your circle close", points: 6, max: 15 },
  ],
  nextBestAction: "Pick a gift for your next upcoming moment — we've lined up ideas.",
};

export const TIMELINE: TimelineGift[] = GIFTS.filter((x) => x.contact_id === "1").map((x) => ({ id: x.id, year: x.gifted_at.slice(0, 4), name: x.gift_name ?? "A gift", note: x.notes ?? null, amount: null, eventType: x.event_type, image: x.image ?? null }));

export const MOM_MOMENTS = VIEW.moments.filter((m) => m.contact.id === "1");
export const PLAN: PlanViewData = {
  eventId: "e1",
  occasionDate: "2026-10-03",
  heading: "Mom's birthday",
  dateLabel: "3 Oct 2026",
  daysAway: 9,
  plan: { id: "plan1", status: "ordered", giftName: "Jasmine Scented Candle", productId: "p1", productSlug: "x", note: "She loves the scent", image: "/seed-images/candle-trio.webp", orderId: "o1", orderNumber: "GP-20260921-1042" },
};

// ---- for the diary BOOK: the same rows shape the real page reads, and a small catalogue the idea engine can rank
export const PLANS: DiaryPlanRow[] = [
  { id: "plan1", contact_id: "1", event_id: "e1", occasion_date: "2026-10-03", product_id: "p1", gift_name: null, note: "She loves the scent", status: "chosen", order_id: null, created_at: "2026-09-20T10:00:00Z" },
  { id: "plan2", contact_id: "2", event_id: "e4", occasion_date: "2026-10-12", product_id: null, gift_name: "A leather-bound journal", note: null, status: "idea", order_id: null, created_at: "2026-09-22T10:00:00Z" },
];
export const ROWS: DiaryRows = { contacts: CONTACTS, events: EVENTS, gifts: GIFTS, plans: PLANS, linkedOrders: new Map(), timezone: "Asia/Kolkata" };

const TAGS = { tags: ["gift", "flowers", "coffee", "books"], occasionTags: ["birthday", "anniversary", "thank-you", "housewarming"], recipientTags: ["for-her", "for-him", "for-parents"], averageRating: 4.5, reviewCount: 12 };
export const POOL: CandidatePool = (() => {
  const byId: CandidatePool["byId"] = new Map();
  const candidates = IDEAS.map((i) => {
    const c = { id: i.productId, name: i.name, ...TAGS, categoryName: "Gifts", price: i.price };
    byId.set(i.productId, { ...c, slug: i.slug, thumbnail: i.thumbnail, vendorName: null });
    return c;
  });
  return { candidates, byId };
})();

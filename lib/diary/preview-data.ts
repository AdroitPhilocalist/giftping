import type { CandidatePool } from "./candidates";
import type { HomeBookData } from "./home-book";
import { buildHomeBookData } from "./home-book";
import type { DiaryPlanRow } from "./plans";
import { effectivePlanStatus, planFor } from "./plans";
import { toIdeaCards } from "./page-data";
import { addDays, formatISODate, isLeapYear, localDateIn, nextOccurrence, parseISODate, type ISODate } from "./recurrence";
import { suggestGifts, type SuggestionCandidate } from "./suggestion-matcher";
import { buildDiaryView, type DiaryContactRow, type DiaryEventRow, type DiaryGiftRow, type Moment } from "./view";
import type { IdeaCardData } from "./ui-types";
import type { TimelineGift } from "@/components/diary/person/GiftTimeline";
import type { PlanViewData } from "@/components/diary/person/PlanSheet";
import type { DiaryRows } from "@/lib/db/diary";
import { longDate } from "./format";
import { giftsForHref } from "./gift-links";
import { momentPhrase } from "./present";

/**
 * The sample diary behind /diary/preview. It is built from the same row shapes and the same
 * `buildHomeBookData` as the real diary, but every value is invented here — no session, no customer
 * query, no photos from storage. Dates are relative to today so the preview always has something
 * coming up instead of looking like a screenshot from last year.
 */
export const PREVIEW_TIMEZONE = "Asia/Kolkata";

const TAGS: Omit<SuggestionCandidate, "id" | "name" | "price" | "averageRating" | "reviewCount"> = {
  tags: [],
  occasionTags: [],
  recipientTags: [],
  categoryName: "Gifts",
};

type PoolProduct = SuggestionCandidate & { slug: string; thumbnail: string | null; vendorName: string | null };

const FALLBACK_PRODUCTS: PoolProduct[] = [
  {
    ...TAGS, id: "preview-amber-candle", name: "Amber Glow Candle & Diffuser Set", price: 1499,
    tags: ["candle", "diffuser", "home fragrance"], occasionTags: ["housewarming", "thank-you", "birthday"], recipientTags: ["for-her", "for-parents"],
    averageRating: 4.5, reviewCount: 6, slug: "amber-glow-candle-and-diffuser-set", thumbnail: "/seed-images/candle-shelf.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-silk-scarf", name: "Floral Silk Scarf", price: 1899,
    tags: ["scarf", "silk", "floral"], occasionTags: ["birthday", "anniversary", "thank-you"], recipientTags: ["for-her", "for-parents"],
    averageRating: 4.33, reviewCount: 3, slug: "floral-silk-scarf", thumbnail: "/seed-images/silk-scarf.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-dried-flower-candle", name: "Dried Flower Vase & Candle Set", price: 1699,
    tags: ["dried flowers", "vase", "candle"], occasionTags: ["housewarming", "birthday"], recipientTags: ["for-her", "for-parents"],
    averageRating: 4.4, reviewCount: 5, slug: "dried-flower-vase-and-candle-set", thumbnail: "/seed-images/vase-candle.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-brass-lamp", name: "Kuthu Vilakku Brass Lamp", price: 2299,
    tags: ["brass", "lamp", "housewarming"], occasionTags: ["housewarming", "wedding"], recipientTags: ["for-parents"],
    averageRating: 4.5, reviewCount: 2, slug: "kuthu-vilakku-brass-lamp", thumbnail: "/seed-images/brass-lamp.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-watch-box", name: "Executive Watch Gift Box", price: 5499,
    tags: ["watch", "chronograph", "luxury"], occasionTags: ["birthday", "anniversary"], recipientTags: ["for-him"],
    averageRating: 4, reviewCount: 5, slug: "executive-watch-gift-box", thumbnail: "/seed-images/watch-box.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-leather-journal", name: "Leather Journal & Pen Set", price: 1799,
    tags: ["journal", "pen", "leather"], occasionTags: ["birthday", "thank-you"], recipientTags: ["for-him", "for-colleagues"],
    averageRating: 4.67, reviewCount: 3, slug: "leather-journal-and-pen-set", thumbnail: "/seed-images/leather-journal.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-wallet", name: "Monogrammed Leather Wallet", price: 2199,
    tags: ["wallet", "leather", "monogram"], occasionTags: ["birthday", "anniversary"], recipientTags: ["for-him"],
    averageRating: 5, reviewCount: 3, slug: "monogrammed-leather-wallet", thumbnail: "/seed-images/leather-wallet.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-mithai", name: "Festive Mithai & Dry Fruits Box", price: 1399,
    tags: ["mithai", "diwali", "sweets"], occasionTags: ["thank-you"], recipientTags: ["for-parents", "for-colleagues"],
    averageRating: 4, reviewCount: 3, slug: "festive-mithai-and-dry-fruits-box", thumbnail: "/seed-images/box-ivory.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-truffle", name: "Belgian Truffle Gift Box (24 pcs)", price: 1299,
    tags: ["chocolate", "truffles", "sweet"], occasionTags: ["birthday", "thank-you", "anniversary"], recipientTags: ["for-her", "for-him", "for-colleagues"],
    averageRating: 4.5, reviewCount: 2, slug: "belgian-truffle-gift-box-24", thumbnail: "/seed-images/box-gold.webp", vendorName: "GiftPing",
  },
  {
    ...TAGS, id: "preview-bouquet", name: "Peony Rose Bouquet", price: 1499,
    tags: ["flowers", "peony", "bouquet"], occasionTags: ["birthday", "anniversary"], recipientTags: ["for-her"],
    averageRating: 4.25, reviewCount: 4, slug: "peony-rose-bouquet", thumbnail: "/seed-images/peony-bouquet.webp", vendorName: "GiftPing",
  },
];

/** A small, real-slug catalogue used only if the live catalogue query returns nothing (e.g. a cold local DB). */
export function previewCandidatePool(): CandidatePool {
  const byId: CandidatePool["byId"] = new Map();
  for (const product of FALLBACK_PRODUCTS) byId.set(product.id, product);
  return { candidates: FALLBACK_PRODUCTS, byId };
}

function dateAhead(today: ISODate, daysAhead: number, yearsAgo: number): ISODate {
  const next = addDays(today, daysAhead);
  const p = parseISODate(next)!;
  let year = p.year - yearsAgo;
  // Keep 29 February valid when the target year isn't a leap year.
  if (p.month === 2 && p.day === 29 && !isLeapYear(year)) year -= 1;
  return formatISODate(year, p.month, p.day);
}

function giftAt(today: ISODate, daysAgo: number) {
  return `${addDays(today, -daysAgo)}T10:00:00Z`;
}

function productIdFor(pool: CandidatePool, slug: string): string | null {
  for (const [id, product] of pool.byId) if (product.slug === slug) return id;
  return pool.candidates[0]?.id ?? null;
}

function sampleContacts(): DiaryContactRow[] {
  return [
    {
      id: "preview-mom", name: "Mom", relationship: "Mother", is_favorite: true,
      tagline: "Always makes everyone feel special", budget_max: 2000,
      interests: ["candle", "silk", "flowers", "mithai"],
      notes: "She said she liked the jasmine candle at Nani's. Also mentioned she wants a lightweight silk saree in pastel shades. Maybe plan something with a handwritten note this time.",
      gift_preferences: "Handmade things, soft colours, anything with a story",
      photo_url: null,
    },
    { id: "preview-dad", name: "Dad", relationship: "Father", is_favorite: false, tagline: "The quiet one who remembers everything", budget_max: 5000, interests: ["watch", "book", "coffee"], notes: "He writes down every trip in an old notebook. A leather journal would be a good place to start.", gift_preferences: "Practical, well made, no fuss", photo_url: null },
    { id: "preview-arjun", name: "Arjun", relationship: "Brother", is_favorite: false, tagline: "Always planning the next trip", budget_max: 1500, interests: ["travel", "coffee", "book"], notes: "Mentioned a coffee brewing kit after his last trip.", gift_preferences: null, photo_url: null },
    { id: "preview-nani", name: "Nani", relationship: "Grandparent", is_favorite: false, tagline: "Keeps the whole family fed", budget_max: 2500, interests: ["brass", "flower", "sweet"], notes: "Her puja shelf is full of brass. She still says the diya from three years ago is her favourite.", gift_preferences: "Traditional, useful, something for the puja room", photo_url: null },
    { id: "preview-meera", name: "Meera", relationship: "Friend", is_favorite: false, tagline: "The friend who makes ordinary days feel like occasions", budget_max: 1800, interests: ["candle", "flower", "chocolate"], notes: "Just moved into her new flat. She loves warm scents and fresh flowers.", gift_preferences: "Warm, cosy, a little indulgent", photo_url: null },
  ];
}

function sampleEvents(today: ISODate): DiaryEventRow[] {
  const recurring = (id: string, contactId: string, daysAhead: number, yearsAgo: number, over: Partial<DiaryEventRow> = {}): DiaryEventRow => ({
    id, contact_id: contactId, event_type: "birthday", title: null, event_date: dateAhead(today, daysAhead, yearsAgo),
    is_recurring: true, reminder_days: [7, 3], is_active: true, notes: null, created_at: "2020-01-01T00:00:00Z", ...over,
  });
  return [
    recurring("preview-e1", "preview-mom", 9, 60),
    recurring("preview-e2", "preview-mom", 18, 36, { event_type: "anniversary" }),
    {
      id: "preview-e3", contact_id: "preview-meera", event_type: "housewarming", title: null,
      event_date: addDays(today, 14), is_recurring: false, reminder_days: [7, 3], is_active: true, notes: null, created_at: "2020-01-01T00:00:00Z",
    },
    recurring("preview-e4", "preview-dad", 33, 64, { event_type: "anniversary" }),
    recurring("preview-e5", "preview-arjun", 41, 31),
    recurring("preview-e6", "preview-nani", 52, 78),
  ];
}

function sampleGifts(today: ISODate): (DiaryGiftRow & { id: string })[] {
  const gifts: (DiaryGiftRow & { id: string })[] = [
    { id: "preview-g1", contact_id: "preview-mom", gift_name: "Amber candle & diffuser set", product_id: null, event_type: "birthday", amount: 1499, gifted_at: giftAt(today, 70), notes: "She loved the warm scent and kept the box.", image: "/seed-images/candle-shelf.webp" },
    { id: "preview-g2", contact_id: "preview-mom", gift_name: "Handwoven silk scarf", product_id: null, event_type: "birthday", amount: 1899, gifted_at: giftAt(today, 380), notes: "Her favourite colour. Wore it during the last family lunch.", image: "/seed-images/silk-scarf.webp" },
    { id: "preview-g3", contact_id: "preview-mom", gift_name: "Brass diya lamp", product_id: null, event_type: "festival", amount: 899, gifted_at: giftAt(today, 740), notes: "Still keeps it in the puja room.", image: "/seed-images/brass-lamp.webp" },
    { id: "preview-g4", contact_id: "preview-dad", gift_name: "Monogrammed leather wallet", product_id: null, event_type: "anniversary", amount: 2199, gifted_at: giftAt(today, 90), notes: "He uses it every day now.", image: "/seed-images/leather-wallet.webp" },
    { id: "preview-g5", contact_id: "preview-arjun", gift_name: "Leather journal & pen set", product_id: null, event_type: "birthday", amount: 1799, gifted_at: giftAt(today, 45), notes: "Already half full of trip notes.", image: "/seed-images/leather-journal.webp" },
    { id: "preview-g6", contact_id: "preview-meera", gift_name: "Belgian truffle box", product_id: null, event_type: "housewarming", amount: 1299, gifted_at: giftAt(today, 200), notes: "She said the dark chocolate ones were the best.", image: "/seed-images/box-gold.webp" },
    { id: "preview-g7", contact_id: "preview-nani", gift_name: "Brass kumkum thali set", product_id: null, event_type: "housewarming", amount: 1599, gifted_at: giftAt(today, 120), notes: "It sits on her puja shelf now.", image: "/seed-images/brass-thali.webp" },
  ];
  return gifts.sort((a, b) => b.gifted_at.localeCompare(a.gifted_at));
}

function samplePlans(today: ISODate, events: DiaryEventRow[], pool: CandidatePool): DiaryPlanRow[] {
  const occasion = (id: string) => {
    const event = events.find((e) => e.id === id)!;
    return nextOccurrence(event.event_date, event.is_recurring, today)!;
  };
  return [
    {
      id: "preview-plan-mom", contact_id: "preview-mom", event_id: "preview-e1", occasion_date: occasion("preview-e1"),
      product_id: productIdFor(pool, "amber-glow-candle-and-diffuser-set"), gift_name: null, note: "She loves the warm amber scent",
      status: "chosen", order_id: null, created_at: `${addDays(today, -2)}T10:00:00Z`,
    },
    {
      id: "preview-plan-meera", contact_id: "preview-meera", event_id: "preview-e3", occasion_date: occasion("preview-e3"),
      product_id: productIdFor(pool, "dried-flower-vase-and-candle-set"), gift_name: null, note: "Something warm for the new flat",
      status: "idea", order_id: null, created_at: `${addDays(today, -1)}T10:00:00Z`,
    },
    {
      id: "preview-plan-dad", contact_id: "preview-dad", event_id: "preview-e4", occasion_date: occasion("preview-e4"),
      product_id: null, gift_name: "A leather-bound journal", note: "He writes down every trip",
      status: "idea", order_id: null, created_at: `${addDays(today, -3)}T10:00:00Z`,
    },
  ];
}

export interface PreviewPersonData {
  contact: DiaryContactRow;
  events: DiaryEventRow[];
  moments: Moment[];
  timeline: TimelineGift[];
  plan: PlanViewData | null;
  ideas: IdeaCardData[];
  ideasWho: string;
  pick: { eventId: string; occasionDate: string; pickedProductId: string | null } | null;
  defaultEventType?: string;
  giftsHref: string;
}

export interface PreviewData {
  today: ISODate;
  rows: DiaryRows;
  pool: CandidatePool;
  home: HomeBookData;
  people: Map<string, PreviewPersonData>;
}

function buildPersonData(contact: DiaryContactRow, rows: DiaryRows, pool: CandidatePool, today: ISODate, eventId?: string): PreviewPersonData {
  const events = rows.events.filter((e) => e.contact_id === contact.id);
  const gifts = rows.gifts.filter((g) => g.contact_id === contact.id);
  const view = buildDiaryView({ contacts: [contact], events, gifts, today });
  const asked = eventId ? view.moments.find((m) => m.event.id === eventId && m.event.is_active) : undefined;
  const target = asked ?? view.nextByContact.get(contact.id);

  const ideas = toIdeaCards(
    suggestGifts({
      person: { relationship: contact.relationship, interests: contact.interests, giftPreferences: contact.gift_preferences },
      context: { eventType: target?.event.event_type ?? null, budgetMax: contact.budget_max === null ? null : Number(contact.budget_max) },
      candidates: pool.candidates,
      alreadyGiftedProductIds: new Set(gifts.map((g) => g.product_id).filter((p): p is string => !!p)),
      limit: 6,
    }),
    pool,
    new Set(),
  );

  let plan: PlanViewData | null = null;
  const savedPlan = target ? planFor(rows.plans, target.event.id, target.occurrence) : null;
  if (target) {
    const product = savedPlan?.product_id ? pool.byId.get(savedPlan.product_id) : undefined;
    plan = {
      eventId: target.event.id,
      occasionDate: target.occurrence,
      heading: momentPhrase(contact.name, target.event.event_type, target.event.title),
      dateLabel: longDate(target.occurrence),
      daysAway: target.daysAway,
      plan: savedPlan
        ? {
            id: savedPlan.id,
            status: effectivePlanStatus(savedPlan, null),
            giftName: savedPlan.gift_name ?? product?.name ?? null,
            productId: savedPlan.product_id,
            productSlug: product?.slug ?? null,
            note: savedPlan.note,
            image: product?.thumbnail ?? null,
            orderId: null,
            orderNumber: null,
          }
        : null,
    };
  }

  const timeline: TimelineGift[] = gifts.map((g) => ({
    id: g.id,
    year: g.gifted_at.slice(0, 4),
    name: g.gift_name ?? "A gift",
    note: g.notes ?? null,
    amount: g.amount === null ? null : Number(g.amount),
    eventType: g.event_type,
    image: g.image ?? null,
  }));

  return {
    contact,
    events,
    moments: view.moments,
    timeline,
    plan,
    ideas,
    ideasWho: target ? momentPhrase(contact.name, target.event.event_type, target.event.title) : contact.name,
    pick: target ? { eventId: target.event.id, occasionDate: target.occurrence, pickedProductId: plan?.plan?.productId ?? null } : null,
    defaultEventType: target?.event.event_type,
    giftsHref: giftsForHref(contact.relationship),
  };
}

export function buildPreviewData(pool: CandidatePool = previewCandidatePool(), today: ISODate = localDateIn(PREVIEW_TIMEZONE)): PreviewData {
  const effectivePool = pool.candidates.length > 0 ? pool : previewCandidatePool();
  const contacts = sampleContacts();
  const events = sampleEvents(today);
  const gifts = sampleGifts(today);
  const plans = samplePlans(today, events, effectivePool);
  const rows: DiaryRows = { contacts, events, gifts, plans, linkedOrders: new Map(), timezone: PREVIEW_TIMEZONE };
  const home = buildHomeBookData({ rows, pool: effectivePool, wished: new Set(), photoUrls: new Map(), today });
  const people = new Map(contacts.map((contact) => [contact.id, buildPersonData(contact, rows, effectivePool, today)]));
  return { today, rows, pool: effectivePool, home, people };
}

/** One sample person, optionally for a specific date (`?event=…`) — mirrors the real person page. */
export function buildPreviewPerson(data: PreviewData, contactId: string, eventId?: string): PreviewPersonData | null {
  const contact = data.rows.contacts.find((c) => c.id === contactId);
  return contact ? buildPersonData(contact, data.rows, data.pool, data.today, eventId) : null;
}

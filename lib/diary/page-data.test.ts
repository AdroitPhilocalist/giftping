import { describe, expect, it } from "vitest";
import { toCalendarMarks, toIdeaCards, toMomentCard, toMonthData, toPersonCards } from "./page-data";
import { buildDiaryView, type DiaryContactRow, type DiaryEventRow } from "./view";

const contact = (id: string, name: string, over: Partial<DiaryContactRow> = {}): DiaryContactRow => ({ id, name, relationship: null, interests: [], gift_preferences: null, notes: null, budget_max: null, is_favorite: false, ...over });
const event = (id: string, contact_id: string, event_date: string, over: Partial<DiaryEventRow> = {}): DiaryEventRow => ({ id, contact_id, event_type: "birthday", title: null, event_date, is_recurring: true, reminder_days: [7, 3], is_active: true, notes: null, ...over });

const contacts = [contact("mom", "Mom", { photo_url: "u/mom-x.webp" }), contact("dad", "Dad", { is_favorite: true }), contact("nani", "Nani"), contact("meera", "Meera")];
const events = [event("e1", "mom", "1966-10-03"), event("e2", "dad", "1960-10-20", { event_type: "festival", title: "Diwali" }), event("e3", "meera", "1990-12-01")];
const today = "2026-09-24";
const view = buildDiaryView({ contacts, events, gifts: [], today });

describe("diary page data", () => {
  it("makes a ticket from a moment", () => {
    const card = toMomentCard(view.upcoming[0]);
    expect(card).toMatchObject({ contactId: "mom", title: "Mom's Birthday", eventType: "birthday", dateLabel: "3 Oct 2026", daysAway: 9, handled: false, milestone: 60 });
    expect(toMomentCard(view.upcoming[1]).title).toBe("Diwali");
  });

  it("orders people: favourites first, then soonest, then no-date people A→Z, with signed photo urls", () => {
    const cards = toPersonCards(contacts, view.nextByContact, new Map([["u/mom-x.webp", "https://signed/mom"]]));
    expect(cards.map((c) => c.id)).toEqual(["dad", "mom", "meera", "nani"]);
    expect(cards.find((c) => c.id === "mom")?.photoUrl).toBe("https://signed/mom");
    expect(cards.find((c) => c.id === "dad")?.photoUrl).toBeNull();
    expect(cards.find((c) => c.id === "nani")?.next).toBeNull();
  });

  it("marks calendar days with who and what, across the surrounding year, and leaves out paused dates", () => {
    const marks = toCalendarMarks([...events, event("e4", "nani", "1950-11-11", { is_active: false })], contacts, today);
    expect(marks["2026-10-03"]).toEqual([{ contactId: "mom", label: "Mom's Birthday", eventType: "birthday" }]);
    expect(marks["2026-10-20"]?.[0].label).toBe("Diwali");
    expect(marks["2027-10-03"]).toBeDefined();
    expect(marks["2026-11-11"]).toBeUndefined();
    expect(marks["2025-10-03"]).toBeDefined();
  });

  it("shapes gift ideas and drops products that left the catalogue", () => {
    const pool = { candidates: [], byId: new Map([["p1", { id: "p1", slug: "candle", name: "Candle", tags: [], occasionTags: [], recipientTags: [], price: 1299, averageRating: 4, reviewCount: 3, thumbnail: "/t.webp", vendorName: "Aurelia" }]]) };
    const ideas = toIdeaCards([{ productId: "p1", score: 9, reasons: ["Loves candles"] }, { productId: "gone", score: 5, reasons: [] }], pool, new Set(["p1"]));
    expect(ideas).toEqual([{ productId: "p1", slug: "candle", name: "Candle", price: 1299, thumbnail: "/t.webp", vendorName: "Aurelia", reason: "Loves candles", wished: true }]);
  });

  it("lays out the year: the right weekday for the 1st, the right number of days, and marks on the right days", () => {
    const months = toMonthData(events, contacts, 2026);
    expect(months).toHaveLength(12);
    expect(months[9]).toMatchObject({ month: 10, leading: 4, days: 31 }); // 1 Oct 2026 is a Thursday
    expect(months[1].days).toBe(28);
    expect(months[9].marks[3]).toEqual([{ contactId: "mom", label: "Mom's Birthday", eventType: "birthday" }]);
    expect(months[9].marks[20]?.[0].label).toBe("Diwali");
    expect(months[11].marks[1]?.[0].label).toBe("Meera's Birthday");
    expect(Object.keys(months[0].marks)).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import { isRemembered, lastYearsGift, occurrencesInYear, rememberedStreak, reviewYear, summariseYear } from "./memories";
import type { DiaryContactRow, DiaryEventRow, DiaryGiftRow } from "./view";

const contact = (id: string, name: string): DiaryContactRow => ({ id, name, relationship: null, interests: [], gift_preferences: null, notes: null, budget_max: null, is_favorite: false });
const event = (over: Partial<DiaryEventRow> & { id: string; contact_id: string; event_date: string }): DiaryEventRow => ({
  event_type: "birthday", title: null, is_recurring: true, reminder_days: [7, 3], is_active: true, notes: null, created_at: "2020-01-01T00:00:00Z", ...over,
});
const gift = (over: Partial<DiaryGiftRow> & { id: string; contact_id: string; gifted_at: string }): DiaryGiftRow => ({ gift_name: "A gift", product_id: null, event_type: "birthday", amount: null, ...over });

const mom = contact("mom", "Mom");
const dad = contact("dad", "Dad");
const contacts = [mom, dad];

describe("occurrencesInYear", () => {
  it("places recurring dates in the year, Feb 29 on Feb 28 in a common year, one-offs only in their own year, paused ones nowhere", () => {
    const events = [
      event({ id: "b", contact_id: "mom", event_date: "1966-10-03" }),
      event({ id: "leap", contact_id: "dad", event_date: "1968-02-29" }),
      event({ id: "once", contact_id: "mom", event_date: "2026-05-01", is_recurring: false, event_type: "graduation" }),
      event({ id: "paused", contact_id: "dad", event_date: "1970-06-06", is_active: false }),
    ];
    const in2026 = occurrencesInYear(events, contacts, 2026).map((o) => `${o.event.id}:${o.date}`);
    expect(in2026).toEqual(["leap:2026-02-28", "once:2026-05-01", "b:2026-10-03"]);
    expect(occurrencesInYear(events, contacts, 2027).map((o) => o.event.id)).toEqual(["leap", "b"]);
    expect(occurrencesInYear(events, contacts, 2024).find((o) => o.event.id === "leap")?.date).toBe("2024-02-29");
    expect(occurrencesInYear(events, contacts, 1960)).toEqual([]);
  });
});

describe("remembering", () => {
  it("counts a gift in the 45 days before, or the day after, but not later", () => {
    const gifts = [gift({ id: "g", contact_id: "mom", gifted_at: "2026-09-01T10:00:00Z" })];
    expect(isRemembered(gifts, "mom", "2026-10-03")).toBe(true);
    expect(isRemembered(gifts, "mom", "2026-10-30")).toBe(false);
    expect(isRemembered(gifts, "dad", "2026-10-03")).toBe(false);
    expect(isRemembered([gift({ id: "late", contact_id: "mom", gifted_at: "2026-10-05T10:00:00Z" })], "mom", "2026-10-03")).toBe(false);
  });
});

describe("summariseYear", () => {
  const events = [
    event({ id: "mom-b", contact_id: "mom", event_date: "1966-03-14" }),
    event({ id: "dad-b", contact_id: "dad", event_date: "1960-10-10" }),
    event({ id: "mom-a", contact_id: "mom", event_date: "1990-10-20", event_type: "anniversary" }),
    event({ id: "diwali", contact_id: "mom", event_date: "2020-10-31", event_type: "festival", title: "Diwali" }),
  ];
  const gifts = [gift({ id: "g1", contact_id: "mom", gifted_at: "2026-03-01T00:00:00Z" })];

  it("counts what is remembered, what is ahead, and the busiest month", () => {
    const s = summariseYear({ events, contacts, gifts, today: "2026-09-24", year: 2026 });
    expect(s.total).toBe(4);
    expect(s.remembered).toBe(1); // Mom's March birthday had a gift
    expect(s.toGo).toBe(3); // Oct x3 are ahead
    expect(s.perMonth[9]).toBe(3);
    expect(s.busiest).toEqual({ month: 10, count: 3, highlights: ["Diwali", "1 birthday", "1 anniversary"] });
  });

  it("never counts a moment against you that passed before you added it", () => {
    const late = [event({ id: "late", contact_id: "mom", event_date: "1966-03-14", created_at: "2026-06-01T00:00:00Z" })];
    const s = summariseYear({ events: late, contacts, gifts: [], today: "2026-09-24", year: 2026 });
    expect(s.total).toBe(1);
    expect(s.remembered).toBe(0);
  });
});

describe("reviewYear", () => {
  it("summarises the gifts of the year and picks a favourite occasion", () => {
    const events = [event({ id: "mom-b", contact_id: "mom", event_date: "1966-03-14" })];
    const gifts = [
      gift({ id: "1", contact_id: "mom", gifted_at: "2026-03-01T00:00:00Z", event_type: "birthday" }),
      gift({ id: "2", contact_id: "dad", gifted_at: "2026-06-01T00:00:00Z", event_type: "birthday" }),
      gift({ id: "3", contact_id: "mom", gifted_at: "2026-10-01T00:00:00Z", event_type: "festival" }),
      gift({ id: "4", contact_id: "mom", gifted_at: "2025-12-01T00:00:00Z", event_type: "festival" }),
    ];
    const r = reviewYear({ events, contacts, gifts, today: "2026-12-31", year: 2026 });
    expect(r.giftsGiven).toBe(3);
    expect(r.peopleMadeHappy).toBe(2);
    expect(r.favouriteOccasion).toEqual({ type: "birthday", count: 2 });
    expect(r.topPeople[0]).toEqual({ contactId: "mom", gifts: 2 });
    expect(r.momentsRemembered).toBe(1);
  });

  it("has no favourite when nothing is in the diary", () => {
    expect(reviewYear({ events: [], contacts, gifts: [], today: "2026-12-31", year: 2026 }).favouriteOccasion).toBeNull();
  });
});

describe("rememberedStreak", () => {
  const events = [event({ id: "mom-b", contact_id: "mom", event_date: "1966-03-14" }), event({ id: "dad-b", contact_id: "dad", event_date: "1960-06-10" }), event({ id: "mom-a", contact_id: "mom", event_date: "1990-08-20", event_type: "anniversary" })];
  it("counts consecutive remembered moments back from the latest one that passed, and a miss ends it", () => {
    const all = [
      gift({ id: "1", contact_id: "mom", gifted_at: "2026-03-01T00:00:00Z" }),
      gift({ id: "2", contact_id: "dad", gifted_at: "2026-06-01T00:00:00Z" }),
      gift({ id: "3", contact_id: "mom", gifted_at: "2026-08-10T00:00:00Z", event_type: "anniversary" }),
    ];
    expect(rememberedStreak({ events, contacts, gifts: all, today: "2026-09-24" })).toBeGreaterThanOrEqual(3);
    // dad's June gift missing: streak (newest first: Aug anniv ✓, Jun dad ✗) = 1
    expect(rememberedStreak({ events, contacts, gifts: [all[0], all[2]], today: "2026-09-24" })).toBe(1);
    expect(rememberedStreak({ events, contacts, gifts: [], today: "2026-09-24" })).toBe(0);
  });
});

describe("lastYearsGift", () => {
  const gifts = [
    gift({ id: "old", contact_id: "mom", gifted_at: "2025-09-20T00:00:00Z", gift_name: "Silk scarf", event_type: "birthday" }),
    gift({ id: "other-kind", contact_id: "mom", gifted_at: "2025-10-01T00:00:00Z", gift_name: "Diya set", event_type: "festival" }),
    gift({ id: "someone-else", contact_id: "dad", gifted_at: "2025-10-02T00:00:00Z", gift_name: "Watch", event_type: "birthday" }),
  ];
  it("finds last year's gift for this person, preferring the same kind of occasion", () => {
    expect(lastYearsGift({ gifts, contactId: "mom", occurrence: "2026-10-03", eventType: "birthday" })?.gift_name).toBe("Silk scarf");
    expect(lastYearsGift({ gifts, contactId: "mom", occurrence: "2026-10-03", eventType: "festival" })?.gift_name).toBe("Diya set");
    expect(lastYearsGift({ gifts, contactId: "mom", occurrence: "2026-03-14", eventType: "birthday" })).toBeNull();
    expect(lastYearsGift({ gifts, contactId: "nobody", occurrence: "2026-10-03", eventType: "birthday" })).toBeNull();
  });
});

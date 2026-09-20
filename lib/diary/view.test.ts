import { describe, expect, it } from "vitest";
import { buildDiaryView, calendarMarks, type DiaryContactRow, type DiaryEventRow, type DiaryGiftRow } from "./view";

const contact = (id: string, over: Partial<DiaryContactRow> = {}): DiaryContactRow => ({ id, name: id, relationship: null, interests: [], gift_preferences: null, notes: null, budget_max: null, is_favorite: false, ...over });
const event = (id: string, contact_id: string, event_date: string, over: Partial<DiaryEventRow> = {}): DiaryEventRow => ({ id, contact_id, event_type: "birthday", title: null, event_date, is_recurring: true, reminder_days: [7, 3], is_active: true, notes: null, ...over });
const gift = (id: string, contact_id: string, gifted_at: string): DiaryGiftRow => ({ id, contact_id, gift_name: "x", product_id: null, event_type: null, amount: null, gifted_at });
const today = "2026-09-20";

describe("buildDiaryView", () => {
  const contacts = [contact("a", { interests: ["tea"] }), contact("b"), contact("c")];
  it("orders moments soonest-first and limits 'upcoming' to the 60-day horizon", () => {
    const v = buildDiaryView({
      contacts, today, gifts: [],
      events: [event("e1", "a", "1990-11-30"), event("e2", "b", "1990-09-25"), event("e3", "c", "1990-09-20"), event("e4", "a", "1990-01-01")],
    });
    expect(v.moments.map((m) => m.event.id)).toEqual(["e3", "e2", "e1", "e4"]);
    expect(v.moments.map((m) => m.daysAway)).toEqual([0, 5, 71, 103]);
    expect(v.upcoming.map((m) => m.event.id)).toEqual(["e3", "e2"]);
    expect(v.moments[1].milestone).toBe(36);
  });
  it("paused events are excluded from upcoming and from a person's 'next' moment", () => {
    const v = buildDiaryView({ contacts, today, gifts: [], events: [event("e1", "a", "1990-09-25", { is_active: false }), event("e2", "a", "1990-10-25")] });
    expect(v.upcoming).toHaveLength(1);
    expect(v.nextByContact.get("a")!.event.id).toBe("e2");
  });
  it("a passed one-off has no moment at all", () => {
    const v = buildDiaryView({ contacts, today, gifts: [], events: [event("e1", "a", "2026-01-01", { is_recurring: false })] });
    expect(v.moments).toEqual([]);
  });
  it("'handled' means a gift was logged for that person in the 45 days up to the occasion", () => {
    const events = [event("e1", "a", "1990-10-10")]; // 20 days away
    expect(buildDiaryView({ contacts, today, events, gifts: [gift("g", "a", "2026-09-01T10:00:00Z")] }).moments[0].handled).toBe(true);
    expect(buildDiaryView({ contacts, today, events, gifts: [gift("g", "a", "2026-08-01T10:00:00Z")] }).moments[0].handled).toBe(false); // too early: last occasion
    expect(buildDiaryView({ contacts, today, events, gifts: [gift("g", "b", "2026-09-01T10:00:00Z")] }).moments[0].handled).toBe(false); // someone else
  });
  it("feeds the gifting score", () => {
    const v = buildDiaryView({
      contacts, today,
      events: [event("e1", "a", "1990-09-30"), event("e2", "b", "1990-12-25")],
      gifts: [gift("g1", "a", "2026-09-10T00:00:00Z"), gift("g2", "b", "2025-01-01T00:00:00Z")],
    });
    expect(v.scoreInput).toEqual({
      contactCount: 3, contactsWithInterests: 1, contactsWithEvents: 2, eventCount: 2,
      upcoming30d: { total: 1, handled: 1 }, giftsLast12Months: 1, // the 2025 gift is over a year old
    });
  });
});

describe("calendarMarks", () => {
  it("groups moments by day of the month", () => {
    const v = buildDiaryView({ contacts: [contact("a"), contact("b")], today, gifts: [], events: [event("e1", "a", "1990-09-25"), event("e2", "b", "1980-09-25"), event("e3", "a", "1990-10-02")] });
    const marks = calendarMarks(v.moments, 2026, 9);
    expect([...marks.keys()]).toEqual([25]);
    expect(marks.get(25)).toHaveLength(2);
    expect(calendarMarks(v.moments, 2026, 10).get(2)).toHaveLength(1);
  });
});

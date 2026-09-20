import { describe, expect, it } from "vitest";
import {
  addDays, daysBetween, dueReminders, isLeapYear, localDateIn, milestoneYears, nextOccurrence, occurrenceInYear, parseISODate,
} from "./recurrence";

describe("dates", () => {
  it("validates real calendar dates", () => {
    expect(parseISODate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    for (const bad of ["2027-02-29", "2026-13-01", "2026-00-10", "2026-04-31", "26-01-01", "", "2026-1-1"]) expect(parseISODate(bad)).toBeNull();
  });
  it("leap years", () => {
    expect([2024, 2028, 2000].every(isLeapYear)).toBe(true);
    expect([2025, 2100, 1900].some(isLeapYear)).toBe(false);
  });
  it("daysBetween / addDays are timezone-proof and cross month/year/leap boundaries", () => {
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2028-02-28", "2028-03-01")).toBe(2);
    expect(daysBetween("2027-02-28", "2027-03-01")).toBe(1);
    expect(daysBetween("2026-09-20", "2026-09-13")).toBe(-7);
    expect(addDays("2026-12-25", 10)).toBe("2027-01-04");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("Feb 29 recurrence", () => {
  it("falls on Feb 28 in non-leap years and Feb 29 in leap years", () => {
    expect(occurrenceInYear("2000-02-29", 2027)).toBe("2027-02-28");
    expect(occurrenceInYear("2000-02-29", 2028)).toBe("2028-02-29");
    expect(occurrenceInYear("2000-02-29", 2100)).toBe("2100-02-28");
  });
  it("next occurrence rolls correctly around the leap day", () => {
    expect(nextOccurrence("2000-02-29", true, "2027-02-01")).toBe("2027-02-28");
    expect(nextOccurrence("2000-02-29", true, "2027-03-01")).toBe("2028-02-29");
    expect(nextOccurrence("2000-02-29", true, "2028-02-29")).toBe("2028-02-29");
    expect(nextOccurrence("2000-02-29", true, "2028-03-01")).toBe("2029-02-28");
  });
});

describe("nextOccurrence", () => {
  it("recurring: today counts; a passed date rolls to next year", () => {
    expect(nextOccurrence("1990-09-20", true, "2026-09-20")).toBe("2026-09-20");
    expect(nextOccurrence("1990-09-20", true, "2026-09-21")).toBe("2027-09-20");
    expect(nextOccurrence("1990-01-05", true, "2026-12-31")).toBe("2027-01-05");
  });
  it("non-recurring: only its own date, and nothing after it passes", () => {
    expect(nextOccurrence("2026-10-01", false, "2026-09-20")).toBe("2026-10-01");
    expect(nextOccurrence("2026-09-20", false, "2026-09-20")).toBe("2026-09-20");
    expect(nextOccurrence("2026-09-19", false, "2026-09-20")).toBeNull();
  });
  it("milestone years", () => {
    expect(milestoneYears("1990-09-20", "2026-09-20")).toBe(36);
    expect(milestoneYears("2026-09-20", "2026-09-20")).toBe(0);
  });
});

describe("dueReminders — exactly-on-the-day, so a daily cron and its re-runs are safe", () => {
  const base = { eventDate: "1990-09-27", isRecurring: true, reminderDays: [7, 3] };
  it("fires the 7-day reminder exactly 7 days out, and the 3-day one exactly 3 days out", () => {
    expect(dueReminders({ ...base, today: "2026-09-20" })).toEqual([{ occurrence: "2026-09-27", daysBefore: 7 }]);
    expect(dueReminders({ ...base, today: "2026-09-24" })).toEqual([{ occurrence: "2026-09-27", daysBefore: 3 }]);
  });
  it("fires nothing on the other days, including the day itself and the day before", () => {
    for (const today of ["2026-09-19", "2026-09-21", "2026-09-23", "2026-09-25", "2026-09-26", "2026-09-27"]) expect(dueReminders({ ...base, today })).toEqual([]);
  });
  it("crosses a year boundary", () => {
    expect(dueReminders({ eventDate: "1990-01-03", isRecurring: true, reminderDays: [7], today: "2026-12-27" })).toEqual([{ occurrence: "2027-01-03", daysBefore: 7 }]);
  });
  it("an event created 5 days before its date never gets a late 7-day reminder", () => {
    expect(dueReminders({ eventDate: "2026-09-25", isRecurring: false, reminderDays: [7], today: "2026-09-20" })).toEqual([]);
  });
  it("Feb 29 birthday: reminder counts back from Feb 28 in a non-leap year", () => {
    expect(dueReminders({ eventDate: "2000-02-29", isRecurring: true, reminderDays: [7], today: "2027-02-21" })).toEqual([{ occurrence: "2027-02-28", daysBefore: 7 }]);
    expect(dueReminders({ eventDate: "2000-02-29", isRecurring: true, reminderDays: [7], today: "2028-02-22" })).toEqual([{ occurrence: "2028-02-29", daysBefore: 7 }]);
  });
  it("passed one-off events and duplicate lead times", () => {
    expect(dueReminders({ eventDate: "2026-01-01", isRecurring: false, reminderDays: [7, 3], today: "2026-09-20" })).toEqual([]);
    expect(dueReminders({ ...base, reminderDays: [7, 7], today: "2026-09-20" })).toHaveLength(1);
  });
});

describe("localDateIn", () => {
  it("the same instant is a different calendar date in different zones", () => {
    const instant = new Date("2026-09-20T20:00:00Z"); // 01:30 on the 21st in IST, 13:00 on the 20th in LA
    expect(localDateIn("Asia/Kolkata", instant)).toBe("2026-09-21");
    expect(localDateIn("America/Los_Angeles", instant)).toBe("2026-09-20");
  });
  it("falls back for an invalid zone instead of throwing", () => {
    expect(localDateIn("Not/AZone", new Date("2026-09-20T20:00:00Z"))).toBe("2026-09-21");
  });
});

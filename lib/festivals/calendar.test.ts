import { describe, expect, it } from "vitest";
import { FESTIVALS, addDays, countdownLine, daysBetween, festivalCountdown, festivalForTheme, shortDate, todayInIndia } from "./calendar";

const diwali = FESTIVALS[0];

describe("dates", () => {
  it("counts calendar days across month and year ends", () => {
    expect(daysBetween("2026-10-03", "2026-11-08")).toBe(36);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    expect(addDays("2026-11-08", -4)).toBe("2026-11-04");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
  it("uses India's calendar day, not the server's", () => {
    // 20:00 UTC on 1 Nov is already 2 Nov 01:30 in India
    expect(todayInIndia(new Date("2026-11-01T20:00:00Z"))).toBe("2026-11-02");
    expect(todayInIndia(new Date("2026-11-01T10:00:00Z"))).toBe("2026-11-01");
  });
  it("formats a short date without a locale", () => {
    expect(shortDate("2026-11-04")).toBe("4 Nov");
  });
});

describe("festivalCountdown", () => {
  it("is in the ordering phase well before the cut-off", () => {
    const c = festivalCountdown(diwali, "2026-10-03")!;
    expect(c.daysToFestival).toBe(36);
    expect(c.orderBy).toBe("2026-11-04");
    expect(c.phase).toBe("ordering");
    expect(countdownLine(c).detail).toBe("Order by 4 Nov for Diwali delivery.");
  });
  it("warns in the last two days before the cut-off, including the cut-off day itself", () => {
    expect(festivalCountdown(diwali, "2026-11-02")!.phase).toBe("last-chance");
    const day = festivalCountdown(diwali, "2026-11-04")!;
    expect(day.phase).toBe("last-chance");
    expect(countdownLine(day).detail).toContain("today");
  });
  it("is honest once the cut-off has passed", () => {
    const c = festivalCountdown(diwali, "2026-11-05")!;
    expect(c.phase).toBe("cutoff-passed");
    expect(countdownLine(c).detail).toContain("may arrive after the festival");
  });
  it("greets on the day and rolls to next year after it", () => {
    expect(festivalCountdown(diwali, "2026-11-08")!.phase).toBe("festival-day");
    const next = festivalCountdown(diwali, "2026-11-09")!;
    expect(next.date).toBe("2027-10-29");
    expect(next.phase).toBe("ordering");
  });
  it("returns null when the calendar has run out", () => {
    expect(festivalCountdown(diwali, "2027-10-30")).toBeNull();
  });
  it("singularises one day", () => {
    expect(countdownLine(festivalCountdown(diwali, "2026-11-07")!).headline).toBe("1 day to Diwali");
  });
});

describe("festivalForTheme", () => {
  it("finds a festival by its theme and ignores others", () => {
    expect(festivalForTheme("diwali")?.name).toBe("Diwali");
    expect(festivalForTheme("native")).toBeNull();
    expect(festivalForTheme(undefined)).toBeNull();
  });
});

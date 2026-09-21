import { describe, expect, it } from "vitest";
import { daysAwayLabel, deskDate, shortDate, weekdayName } from "./format";

describe("diary date formatting", () => {
  it("shortens an ISO date without timezone drift", () => {
    expect(shortDate("2026-09-27")).toBe("27 Sep");
  });
  it("names the weekday from the date parts", () => {
    expect(weekdayName("2026-09-21")).toBe("Monday");
    expect(weekdayName("2024-02-29")).toBe("Thursday");
  });
  it("writes the desk line", () => {
    expect(deskDate("2026-09-21")).toBe("Monday, 21 September");
  });
  it("labels how far away a date is", () => {
    expect(daysAwayLabel(0)).toBe("Today");
    expect(daysAwayLabel(1)).toBe("Tomorrow");
    expect(daysAwayLabel(9)).toBe("In 9 days");
  });
});

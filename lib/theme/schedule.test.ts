import { describe, expect, it } from "vitest";
import { resolveScheduledThemeId, themeScheduleStatus, type ThemeScheduleRow } from "./schedule";

const now = new Date("2026-12-10T12:00:00Z");
const row = (over: Partial<ThemeScheduleRow>): ThemeScheduleRow => ({
  id: "r1",
  themeId: "christmas",
  startsAt: null,
  endsAt: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00Z",
  ...over,
});

describe("themeScheduleStatus", () => {
  it("is paused when inactive, whatever the dates say", () => {
    expect(themeScheduleStatus(row({ isActive: false, startsAt: "2026-01-01T00:00:00Z" }), now)).toBe("paused");
  });
  it("is live with no bounds at all", () => {
    expect(themeScheduleStatus(row({}), now)).toBe("live");
  });
  it("is scheduled before its start", () => {
    expect(themeScheduleStatus(row({ startsAt: "2026-12-20T00:00:00Z" }), now)).toBe("scheduled");
  });
  it("is expired after its end", () => {
    expect(themeScheduleStatus(row({ endsAt: "2026-12-01T00:00:00Z" }), now)).toBe("expired");
  });
  it("is live inside its window", () => {
    expect(themeScheduleStatus(row({ startsAt: "2026-12-01T00:00:00Z", endsAt: "2026-12-25T00:00:00Z" }), now)).toBe("live");
  });
});

describe("resolveScheduledThemeId", () => {
  it("returns null when nothing is live", () => {
    expect(resolveScheduledThemeId([row({ isActive: false })], now)).toBeNull();
    expect(resolveScheduledThemeId([], now)).toBeNull();
  });
  it("returns the one live theme", () => {
    expect(resolveScheduledThemeId([row({ themeId: "diwali" })], now)).toBe("diwali");
  });
  it("ignores scheduled/expired/paused rows even when a live one exists", () => {
    const rows = [
      row({ themeId: "future", startsAt: "2027-01-01T00:00:00Z" }),
      row({ themeId: "past", endsAt: "2026-01-01T00:00:00Z" }),
      row({ themeId: "off", isActive: false }),
      row({ themeId: "current" }),
    ];
    expect(resolveScheduledThemeId(rows, now)).toBe("current");
  });
  it("prefers the most recently STARTED theme when two overlap", () => {
    const rows = [
      row({ themeId: "diwali", startsAt: "2026-11-01T00:00:00Z" }),
      row({ themeId: "christmas", startsAt: "2026-12-05T00:00:00Z" }),
    ];
    expect(resolveScheduledThemeId(rows, now)).toBe("christmas");
  });
  it("breaks a tie on identical start dates by which was created most recently", () => {
    const rows = [
      row({ themeId: "a", startsAt: "2026-12-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" }),
      row({ themeId: "b", startsAt: "2026-12-01T00:00:00Z", createdAt: "2026-06-01T00:00:00Z" }),
    ];
    expect(resolveScheduledThemeId(rows, now)).toBe("b");
  });
  it("an open-ended (no start date) theme loses to one with a real start date, once that one is live", () => {
    const rows = [row({ themeId: "always-on", startsAt: null }), row({ themeId: "seasonal", startsAt: "2026-12-01T00:00:00Z" })];
    expect(resolveScheduledThemeId(rows, now)).toBe("seasonal");
  });
});

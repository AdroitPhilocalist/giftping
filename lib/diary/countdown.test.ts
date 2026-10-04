import { describe, expect, it } from "vitest";
import { countdownPhase, ribbonPercent } from "./countdown";

describe("countdownPhase", () => {
  it("is today at and below zero days, never for a negative count that slipped through", () => {
    expect(countdownPhase(0)).toBe("today");
    expect(countdownPhase(-1)).toBe("today");
  });
  it("is soon within the same 14-day window DateCards already highlights", () => {
    expect(countdownPhase(1)).toBe("soon");
    expect(countdownPhase(14)).toBe("soon");
  });
  it("is far just past that window and beyond", () => {
    expect(countdownPhase(15)).toBe("far");
    expect(countdownPhase(365)).toBe("far");
  });
});

describe("ribbonPercent", () => {
  it("is fully slack at the horizon and fully cinched today", () => {
    expect(ribbonPercent(60)).toBe(0);
    expect(ribbonPercent(0)).toBe(100);
  });
  it("clamps a date further out than the horizon to still-fully-slack, never negative", () => {
    expect(ribbonPercent(400)).toBe(0);
  });
  it("rises smoothly and monotonically as the date approaches", () => {
    const pcts = [60, 45, 30, 14, 7, 1, 0].map((d) => ribbonPercent(d));
    for (let i = 1; i < pcts.length; i++) expect(pcts[i]).toBeGreaterThanOrEqual(pcts[i - 1]);
    expect(ribbonPercent(30)).toBe(50);
  });
  it("respects a custom horizon (e.g. a 7-day window)", () => {
    expect(ribbonPercent(7, 7)).toBe(0);
    expect(ribbonPercent(0, 7)).toBe(100);
  });
  it("never divides by zero for a degenerate horizon", () => {
    expect(ribbonPercent(5, 0)).toBe(0);
    expect(ribbonPercent(0, 0)).toBe(100);
  });
});

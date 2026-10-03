import { describe, expect, it } from "vitest";
import { DEFAULT_ENGRAVING, clampPlacement, displayEngraving, fitFontSize, normaliseEngraving, parsePersonalizationOptions, toPersonalizationOptions } from "./engraving";

const cfg = { label: "Name on the plate", maxLength: 12, required: true };

describe("normaliseEngraving", () => {
  it("accepts a name, collapsing stray whitespace", () => {
    expect(normaliseEngraving("  Aarav   Nair ", cfg)).toEqual({ ok: true, text: "Aarav Nair" });
  });
  it("requires text when the product says so, with the product's own wording", () => {
    expect(normaliseEngraving("", cfg)).toEqual({ ok: false, error: "Please enter the name on the plate." });
    expect(normaliseEngraving("   ", cfg).ok).toBe(false);
    expect(normaliseEngraving(null, cfg).ok).toBe(false);
  });
  it("lets an optional field stay blank", () => {
    expect(normaliseEngraving("", { ...cfg, required: false })).toEqual({ ok: true, text: null });
  });
  it("enforces the length limit in characters, not bytes", () => {
    expect(normaliseEngraving("a".repeat(12), cfg).ok).toBe(true);
    expect(normaliseEngraving("a".repeat(13), cfg).ok).toBe(false);
    expect(normaliseEngraving("आरव नायर", cfg).ok).toBe(true); // 8 characters even though far more bytes
  });
  it("accepts Indian-language names and simple punctuation", () => {
    for (const ok of ["आरव", "அருண்", "O'Brien", "Mom & Dad", "Anita-Rao", "1 Jan 2026", "Priya!"]) expect(normaliseEngraving(ok, { ...cfg, maxLength: 20 }).ok, ok).toBe(true);
  });
  it("rejects markup, symbols and control characters", () => {
    for (const bad of ["<b>x</b>", "a;b", "x=y", "💥", "tab\there"]) expect(normaliseEngraving(bad, cfg).ok, bad).toBe(bad === "tab\there" ? true : false);
  });
  it("treats a line break as whitespace, never as content", () => {
    expect(normaliseEngraving("Line\nTwo", cfg)).toEqual({ ok: true, text: "Line Two" });
  });
});

describe("parsePersonalizationOptions", () => {
  it("returns null for the legacy empty array, junk and other shapes", () => {
    for (const v of [[], null, undefined, "x", 5, {}, [{ type: "other" }], [null, 3]]) expect(parsePersonalizationOptions(v)).toBeNull();
  });
  it("round-trips a config through toPersonalizationOptions", () => {
    const c = { label: "Name", maxLength: 15, required: false, style: "script" as const, x: 20, y: 30, w: 50, h: 10, rotate: -5 };
    expect(parsePersonalizationOptions(toPersonalizationOptions(c))).toEqual(c);
    expect(toPersonalizationOptions(null)).toEqual([]);
  });
  it("clamps hostile numbers and falls back for a bad style or label", () => {
    const c = parsePersonalizationOptions([{ type: "engraving", label: "   ", maxLength: 9999, required: "yes", style: "javascript:alert(1)", x: 500, y: -9, w: 0, h: 1e9, rotate: 999 }])!;
    expect(c.label).toBe(DEFAULT_ENGRAVING.label);
    expect(c.maxLength).toBe(60);
    expect(c.required).toBe(false); // only a real `true` counts
    expect(c.style).toBe("gold");
    expect(c.x).toBeGreaterThanOrEqual(0);
    expect(c.x + c.w).toBeLessThanOrEqual(100);
    expect(c.y + c.h).toBeLessThanOrEqual(100);
    expect(c.rotate).toBe(30);
  });
  it("accepts numbers given as strings, and cleans a long label", () => {
    const c = parsePersonalizationOptions([{ type: "engraving", label: "x".repeat(200), x: "10", y: "20", w: "30", h: "10" }])!;
    expect(c.label).toHaveLength(40);
    expect(c.x).toBe(10);
  });
});

describe("clampPlacement", () => {
  it("keeps the whole box on the photo and a usable size", () => {
    const p = clampPlacement({ x: 90, y: 95, w: 40, h: 20, rotate: 0 });
    expect(p.x + p.w).toBeLessThanOrEqual(100);
    expect(p.y + p.h).toBeLessThanOrEqual(100);
    expect(clampPlacement({ x: 0, y: 0, w: 1, h: 0.1, rotate: 0 })).toMatchObject({ w: 8, h: 3 });
  });
});

describe("fitFontSize", () => {
  const box = { w: 40, h: 12 };
  it("never exceeds what the box height allows", () => {
    expect(fitFontSize("AB", box, "gold")).toBeLessThanOrEqual(box.h * 0.82);
  });
  it("shrinks as the text gets longer so it still fits the width", () => {
    const short = fitFontSize("AARAV", box, "gold");
    const long = fitFontSize("AARAV NAIR AND FAMILY", box, "gold");
    expect(long).toBeLessThan(short);
    expect(long * 21 * 0.8).toBeLessThanOrEqual(box.w + 0.5); // estimated rendered width fits the box
  });
  it("handles the empty string and stays within sane bounds", () => {
    const n = fitFontSize("", box, "gold");
    expect(n).toBeGreaterThan(0);
    expect(fitFontSize("x".repeat(500), box, "gold")).toBeGreaterThanOrEqual(0.8);
  });
  it("falls back to the first style for an unknown id", () => {
    expect(fitFontSize("AARAV", box, "nope")).toBe(fitFontSize("AARAV", box, "gold"));
  });
});

describe("displayEngraving", () => {
  it("uppercases the foil/engraved/print styles but not the handwritten one", () => {
    expect(displayEngraving("Aarav", "gold")).toBe("AARAV");
    expect(displayEngraving("Aarav", "script")).toBe("Aarav");
  });
});

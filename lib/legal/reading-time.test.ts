import { describe, expect, it } from "vitest";
import type { LegalSection } from "@/components/legal/types";
import { legalWordCount, readingMinutes } from "./reading-time";

describe("legal reading time", () => {
  it("never claims a zero-minute read", () => {
    expect(legalWordCount([])).toBe(0);
    expect(readingMinutes([])).toBe(1);
  });

  it("counts headings, paragraphs and list items but ignores rendered nodes", () => {
    const sections: LegalSection[] = [
      { heading: "One two", body: ["three four", { list: ["five", "six seven"] }, { node: null }] },
    ];
    expect(legalWordCount(sections)).toBe(7);
  });

  it("rounds to the nearest minute and floors at one", () => {
    const words = (n: number): LegalSection => ({ heading: "h", body: [Array.from({ length: n }, () => "word").join(" ")] });
    expect(readingMinutes([words(60)])).toBe(1);
    expect(readingMinutes([words(300)])).toBe(2);
    expect(readingMinutes([words(405)])).toBe(2);
    expect(readingMinutes([words(500)])).toBe(3);
  });
});

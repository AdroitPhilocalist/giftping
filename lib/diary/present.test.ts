import { describe, expect, it } from "vitest";
import { daysLabel, daysShort, firstName, initialOf, momentPhrase, momentTitle, monogramTone, occasionName, occasionPlural, possessive, tiltFor } from "./present";

describe("diary wording helpers", () => {
  it("takes the first word of a name, with a friendly fallback", () => {
    expect(firstName("Priya Sharma")).toBe("Priya");
    expect(firstName("  Meera ")).toBe("Meera");
    expect(firstName("")).toBe("Your");
    expect(firstName(null)).toBe("Your");
  });

  it("makes names possessive the same way every time", () => {
    expect(possessive("Mom")).toBe("Mom's");
    expect(possessive("James")).toBe("James's");
  });

  it("words how far away something is", () => {
    expect(daysLabel(0)).toBe("Today");
    expect(daysLabel(-3)).toBe("Today");
    expect(daysLabel(1)).toBe("Tomorrow");
    expect(daysLabel(9)).toBe("9 days");
    expect(daysShort(1)).toBe("1 day");
    expect(daysShort(62)).toBe("62 days");
  });

  it("titles a moment with the person's name, or the festival's own name", () => {
    expect(momentTitle("Mom", "birthday", null)).toBe("Mom's Birthday");
    expect(momentTitle("Arjun", "anniversary", null)).toBe("Arjun's Anniversary");
    expect(momentTitle("Nani", "festival", "Diwali")).toBe("Diwali");
    expect(momentTitle("Nani", "other", "Retirement")).toBe("Nani's Retirement");
    expect(occasionName("thank-you", null)).toBe("Thank you");
    expect(occasionName("birthday", " Big 50 ")).toBe("Big 50");
  });

  it("words a moment as a phrase after 'Gift ideas for'", () => {
    expect(momentPhrase("Mom", "birthday", null)).toBe("Mom's birthday");
    expect(momentPhrase("Nani", "festival", "Diwali")).toBe("Diwali");
    expect(momentPhrase("Dad", "other", "Retirement party")).toBe("Dad's retirement party");
  });

  it("pluralises an occasion for a summary line", () => {
    expect(occasionPlural("birthday")).toBe("Birthdays");
    expect(occasionPlural("anniversary")).toBe("Anniversaries");
    expect(occasionPlural("thank-you")).toBe("Thank-yous");
    expect(occasionPlural("mystery")).toBe("mystery");
  });

  it("gives a person without a photo a stable tint and a sensible initial", () => {
    expect(monogramTone("Mom")).toBe(monogramTone("Mom"));
    expect(["blush", "apricot", "sage", "sky", "mustard", "rose"]).toContain(monogramTone("Dad"));
    expect(initialOf("mom")).toBe("M");
    expect(initialOf("  ✨ Priya")).toBe("P");
    expect(initialOf("❤️")).toBe("♥");
  });

  it("tilts a row of cards by a small, repeatable amount", () => {
    expect(tiltFor(0)).toBe(tiltFor(0));
    expect(tiltFor(8)).toBe(tiltFor(0));
    for (let i = 0; i < 20; i++) expect(Math.abs(tiltFor(i))).toBeLessThanOrEqual(2.4);
  });
});

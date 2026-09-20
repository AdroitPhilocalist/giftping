import { describe, expect, it } from "vitest";
import { buildReminderEmail, escapeHtml, occasionLabel, type ReminderEmailInput } from "./reminder-email";

const base: ReminderEmailInput = {
  recipientFirstName: "Asha", contactName: "Priya", eventType: "birthday", eventTitle: null, daysBefore: 7, occurrence: "2026-09-27", milestoneYears: 31,
  suggestions: [{ name: "Artisan Coffee Box", priceLabel: "₹1,299", url: "https://giftping-lime.vercel.app/products/coffee", reason: "Matches their love of coffee" }],
  diaryUrl: "https://giftping-lime.vercel.app/diary", preferencesUrl: "https://giftping-lime.vercel.app/account/notifications",
};

describe("reminder email", () => {
  it("builds a clear subject, with idea count", () => {
    expect(buildReminderEmail(base).subject).toBe("Priya's 31st birthday is in 7 days — 1 gift idea");
    expect(buildReminderEmail({ ...base, daysBefore: 1, suggestions: [] }).subject).toBe("Priya's 31st birthday is tomorrow");
  });
  it("labels: ordinals, first year, anniversaries, custom titles, other types", () => {
    expect(occasionLabel({ ...base, milestoneYears: 22 })).toBe("Priya's 22nd birthday");
    expect(occasionLabel({ ...base, milestoneYears: 23 })).toBe("Priya's 23rd birthday");
    expect(occasionLabel({ ...base, milestoneYears: 11 })).toBe("Priya's 11th birthday");
    expect(occasionLabel({ ...base, milestoneYears: 0 })).toBe("Priya's birthday");
    expect(occasionLabel({ ...base, eventType: "anniversary", milestoneYears: 5 })).toBe("Priya's 5th anniversary");
    expect(occasionLabel({ ...base, eventType: "graduation" })).toBe("Priya's graduation");
    expect(occasionLabel({ ...base, eventTitle: "Naming ceremony" })).toBe("Priya's Naming ceremony");
  });
  it("escapes everything a user typed — no markup injection", () => {
    const evil = buildReminderEmail({ ...base, contactName: `<script>alert(1)</script> & "Sons"`, recipientFirstName: "<b>x</b>", suggestions: [{ name: `<img src=x onerror=1>`, priceLabel: "₹1", url: `https://x.test/?a="b"`, reason: "<i>r</i>" }] });
    expect(evil.html).not.toContain("<script>");
    expect(evil.html).not.toContain("<img src=x");
    expect(evil.html).not.toContain("<b>x</b>");
    expect(evil.html).toContain("&lt;script&gt;");
    expect(evil.html).toContain("&amp;");
    expect(escapeHtml(`a&b<c>"d"'e'`)).toBe("a&amp;b&lt;c&gt;&quot;d&quot;&#39;e&#39;");
  });
  it("plain-text part carries the same content and links; works with no suggestions", () => {
    const t = buildReminderEmail(base).text;
    expect(t).toContain("Artisan Coffee Box");
    expect(t).toContain("https://giftping-lime.vercel.app/diary");
    const none = buildReminderEmail({ ...base, suggestions: [] });
    expect(none.html).not.toContain("Gift ideas picked for");
    expect(none.text).not.toContain("Gift ideas");
  });
});

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
    expect(none.html).not.toContain("Thoughtful gift ideas for");
    expect(none.text).not.toContain("gift ideas for");
    expect(buildReminderEmail(base).html).toContain("Thoughtful gift ideas for Priya");
  });
  it("carries the date, the countdown and an emoji for the occasion", () => {
    const { html } = buildReminderEmail(base);
    expect(html).toContain("27 September 2026");
    expect(html).toContain("7 days left");
    expect(html).toContain("🎂");
    expect(buildReminderEmail({ ...base, daysBefore: 1 }).html).toContain("1 day left");
    expect(buildReminderEmail({ ...base, eventType: "festival", eventTitle: "Diwali" }).html).toContain("🪔");
  });
  it("says what was given last year, only when the diary knows", () => {
    const withLast = buildReminderEmail({ ...base, lastYear: { giftName: "A silk scarf" } });
    expect(withLast.html).toContain("Last year you gave Priya");
    expect(withLast.html).toContain("A silk scarf");
    expect(withLast.text).toContain("Last year you gave Priya A silk scarf.");
    expect(buildReminderEmail(base).html).not.toContain("Last year you gave");
    expect(buildReminderEmail({ ...base, lastYear: { giftName: "  " } }).html).not.toContain("Last year you gave");
  });
  it("shows pictures only for real web addresses, and escapes everything that goes with them", () => {
    const html = buildReminderEmail({
      ...base,
      robinUrl: "https://giftping-lime.vercel.app/email/robin.png",
      lastYear: { giftName: `<u>x</u>`, imageUrl: "javascript:alert(1)" },
      suggestions: [{ ...base.suggestions[0], imageUrl: `https://cdn.test/a.webp?x="onerror="1` }, { ...base.suggestions[0], name: "Second", imageUrl: "data:image/png;base64,AAAA" }],
    }).html;
    expect(html).toContain('src="https://giftping-lime.vercel.app/email/robin.png"');
    expect(html).toContain("&quot;onerror=&quot;1"); // the quote can't end the attribute
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("data:image");
    expect(html).not.toContain("<u>x</u>");
    expect(buildReminderEmail(base).html).not.toContain("<img"); // no pictures unless given
  });
  it("puts a hidden preview line at the top of the inbox and stays a complete document", () => {
    const { html } = buildReminderEmail(base);
    expect(html).toContain("A little nudge from your diary — 1 gift idea picked for Priya.");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trim().endsWith("</html>")).toBe(true);
  });
});

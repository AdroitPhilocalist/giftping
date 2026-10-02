import { describe, expect, it } from "vitest";
import { signUnsubscribeToken, usableSecret, verifyUnsubscribeToken } from "./unsubscribe-token";
import { LAPSED_AFTER_DAYS, pickSegment } from "./segments";
import { BATCH_SIZE, chunk, estimateFinish, sendAllowance, utcDayStart, utcMonthStart } from "./send-plan";
import { bodyToParagraphs, buildCampaignEmail, listUnsubscribeHeaders } from "./campaign-email";
import { campaignSchema } from "../validation/campaign.schema";

const SECRET = "a-long-enough-test-secret-value-123";
const U1 = "11111111-1111-4111-8111-111111111111";
const U2 = "22222222-2222-4222-8222-222222222222";

describe("unsubscribe tokens", () => {
  it("round-trips a user id", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(U1, SECRET), SECRET)).toBe(U1);
  });
  it("is case-insensitive about the id but a different secret never verifies", () => {
    expect(verifyUnsubscribeToken(signUnsubscribeToken(U1.toUpperCase(), SECRET), SECRET)).toBe(U1);
    expect(verifyUnsubscribeToken(signUnsubscribeToken(U1, SECRET), "another-long-enough-secret-value-99")).toBeNull();
  });
  it("can't be forged for another user by swapping the id", () => {
    const sig = signUnsubscribeToken(U1, SECRET).split(".")[1];
    expect(verifyUnsubscribeToken(`${U2}.${sig}`, SECRET)).toBeNull();
  });
  it("rejects tampering, truncation, junk and empties", () => {
    const t = signUnsubscribeToken(U1, SECRET);
    for (const bad of [t.slice(0, -2), `${t}x`, `${t.slice(0, -1)}${t.endsWith("A") ? "B" : "A"}`, "", "garbage", `${U1}.`, `.${t.split(".")[1]}`, "x".repeat(500), null, undefined]) {
      expect(verifyUnsubscribeToken(bad as string, SECRET)).toBeNull();
    }
  });
  it("refuses to sign for a non-UUID or with no secret, and never verifies against an empty secret", () => {
    expect(() => signUnsubscribeToken("not-a-uuid", SECRET)).toThrow();
    expect(() => signUnsubscribeToken(U1, "")).toThrow();
    expect(verifyUnsubscribeToken(signUnsubscribeToken(U1, SECRET), "")).toBeNull();
  });
  it("only accepts a long-enough secret", () => {
    expect(usableSecret("short")).toBeNull();
    expect(usableSecret(undefined)).toBeNull();
    expect(usableSecret(`  ${SECRET}  `)).toBe(SECRET);
  });
});

describe("pickSegment", () => {
  const now = new Date("2026-10-10T00:00:00Z");
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
  const subs = ["new", "recent", "old", "mixed"];
  const orders = [
    { customer_id: "recent", placed_at: daysAgo(10) },
    { customer_id: "old", placed_at: daysAgo(200) },
    { customer_id: "mixed", placed_at: daysAgo(300) },
    { customer_id: "mixed", placed_at: daysAgo(5) }, // bought long ago AND recently → not lapsed
    { customer_id: "someone-not-subscribed", placed_at: daysAgo(1) },
  ];
  it("all = every subscriber, de-duplicated", () => {
    expect(pickSegment("all", [...subs, "new"], orders, now).sort()).toEqual([...subs].sort());
  });
  it("buyers / non_buyers split the subscribers cleanly", () => {
    expect(pickSegment("buyers", subs, orders, now).sort()).toEqual(["mixed", "old", "recent"]);
    expect(pickSegment("non_buyers", subs, orders, now)).toEqual(["new"]);
  });
  it("lapsed = bought before, but not within the window — judged on the LATEST order", () => {
    expect(pickSegment("lapsed", subs, orders, now)).toEqual(["old"]);
    expect(LAPSED_AFTER_DAYS).toBe(90);
  });
  it("never returns someone who isn't a subscriber", () => {
    for (const s of ["all", "buyers", "non_buyers", "lapsed"] as const) expect(pickSegment(s, subs, orders, now)).not.toContain("someone-not-subscribed");
  });
  it("handles no subscribers, no orders and bad dates", () => {
    expect(pickSegment("buyers", [], orders, now)).toEqual([]);
    expect(pickSegment("non_buyers", ["a"], [], now)).toEqual(["a"]);
    expect(pickSegment("buyers", ["a"], [{ customer_id: "a", placed_at: "not a date" }], now)).toEqual([]);
  });
});

describe("send budget", () => {
  it("allows the smaller of what's left today and this month", () => {
    expect(sendAllowance({ dailyCap: 50, monthlyCap: 1500, sentToday: 20, sentThisMonth: 100 })).toBe(30);
    expect(sendAllowance({ dailyCap: 50, monthlyCap: 1500, sentToday: 0, sentThisMonth: 1480 })).toBe(20);
  });
  it("never goes negative and treats bad numbers as zero", () => {
    expect(sendAllowance({ dailyCap: 50, monthlyCap: 1500, sentToday: 80, sentThisMonth: 0 })).toBe(0);
    expect(sendAllowance({ dailyCap: 0, monthlyCap: 1500, sentToday: 0, sentThisMonth: 0 })).toBe(0);
    expect(sendAllowance({ dailyCap: NaN, monthlyCap: 10, sentToday: 0, sentThisMonth: 0 })).toBe(0);
    expect(sendAllowance({ dailyCap: 50.9, monthlyCap: 1500, sentToday: 0, sentThisMonth: 0 })).toBe(50);
  });
  it("day and month boundaries are UTC", () => {
    const d = new Date("2026-10-31T23:30:00Z");
    expect(utcDayStart(d).toISOString()).toBe("2026-10-31T00:00:00.000Z");
    expect(utcMonthStart(d).toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });
  it("estimates how long a campaign takes at the current limit", () => {
    const b = { dailyCap: 50, monthlyCap: 1500, sentToday: 0, sentThisMonth: 0 };
    expect(estimateFinish(0, b)).toEqual({ days: 0, monthlyLimited: false });
    expect(estimateFinish(40, b)).toEqual({ days: 1, monthlyLimited: false });
    expect(estimateFinish(120, b)).toEqual({ days: 3, monthlyLimited: false });
    expect(estimateFinish(120, { ...b, sentToday: 50 })).toEqual({ days: 4, monthlyLimited: false });
    expect(estimateFinish(2000, b).monthlyLimited).toBe(true);
    expect(estimateFinish(10, { ...b, dailyCap: 0 })).toEqual({ days: null, monthlyLimited: false });
  });
  it("chunks without losing or duplicating anything", () => {
    const list = Array.from({ length: 250 }, (_, i) => i);
    const parts = chunk(list, BATCH_SIZE);
    expect(parts.map((p) => p.length)).toEqual([100, 100, 50]);
    expect(parts.flat()).toEqual(list);
    expect(chunk([], 10)).toEqual([]);
  });
});

describe("campaign email", () => {
  const base = { firstName: "Asha", subject: "Diwali picks", preheader: null, body: "First line.\nStill first paragraph.\n\nSecond paragraph.", cta: { label: "Shop now", url: "https://giftping.example/mall" }, unsubscribeUrl: "https://giftping.example/unsubscribe?t=abc", preferencesUrl: "https://giftping.example/account/notifications", senderLine: "GiftPing, Kochi" };

  it("greets by name, splits paragraphs, keeps single line breaks, and has the CTA", () => {
    const e = buildCampaignEmail(base);
    expect(e.subject).toBe("Diwali picks");
    expect(e.html).toContain("Hi Asha,");
    expect(e.html).toContain("First line.<br/>Still first paragraph.");
    expect(e.html).toContain("Second paragraph.");
    expect(e.html).toContain('href="https://giftping.example/mall"');
    expect(bodyToParagraphs("a\r\n\r\n\r\nb")).toEqual(["a", "b"]);
  });
  it("always carries the reason, an unsubscribe link, preferences and the sender line — in HTML and text", () => {
    const e = buildCampaignEmail(base);
    for (const s of ["you chose to hear from GiftPing", 'href="https://giftping.example/unsubscribe?t=abc"', "manage your email preferences", "GiftPing, Kochi"]) expect(e.html).toContain(s);
    expect(e.text).toContain("Unsubscribe: https://giftping.example/unsubscribe?t=abc");
    expect(e.text).toContain("Email preferences: https://giftping.example/account/notifications");
  });
  it("greets generically without a name", () => {
    expect(buildCampaignEmail({ ...base, firstName: null }).html).toContain("Hi there,");
  });
  it("escapes everything an admin types — no markup, scripts or javascript: links get through", () => {
    const e = buildCampaignEmail({ ...base, firstName: "<b>A</b>", subject: "<script>x</script> 50% off", body: `<img src=x onerror=alert(1)>\n\n<a href="javascript:alert(1)">click</a>`, cta: { label: "<i>Go</i>", url: "javascript:alert(1)" }, senderLine: "<u>GiftPing</u>" });
    expect(e.html).not.toMatch(/<script>|<img src=x|<b>A<|<i>Go|<u>GiftPing|href="javascript:/);
    expect(e.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
  it("flattens a newline smuggled into the subject (header injection)", () => {
    expect(buildCampaignEmail({ ...base, subject: "Hello\r\nBcc: attacker@example.com" }).subject).toBe("Hello Bcc: attacker@example.com");
  });
  it("builds RFC 8058 one-click headers", () => {
    expect(listUnsubscribeHeaders("https://x.test/api/marketing/unsubscribe?t=abc")).toEqual({
      "List-Unsubscribe": "<https://x.test/api/marketing/unsubscribe?t=abc>",
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
  });
});

describe("campaignSchema", () => {
  const ok = { name: "Diwali", subject: "Diwali picks", preheader: "", body: "Hello there", ctaLabel: "", ctaUrl: "", segment: "all" };
  it("accepts a minimal campaign and turns blanks into null", () => {
    const r = campaignSchema.parse(ok);
    expect(r).toMatchObject({ preheader: null, ctaLabel: null, ctaUrl: null, segment: "all" });
  });
  it("its own output re-parses as input (the Zod v4 round-trip lesson)", () => {
    const once = campaignSchema.parse({ ...ok, ctaLabel: "Shop", ctaUrl: "https://example.com" });
    expect(campaignSchema.parse(once)).toEqual(once);
    expect(campaignSchema.parse(campaignSchema.parse(ok))).toEqual(campaignSchema.parse(ok));
  });
  it("requires the button text and link together", () => {
    expect(campaignSchema.safeParse({ ...ok, ctaLabel: "Shop" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, ctaUrl: "/mall" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, ctaLabel: "Shop", ctaUrl: "/mall" }).success).toBe(true);
  });
  it("rejects unsafe links", () => {
    for (const url of ["javascript:alert(1)", "http://insecure.example", "//evil.example", "data:text/html,x", "/a b"]) {
      expect(campaignSchema.safeParse({ ...ok, ctaLabel: "Go", ctaUrl: url }).success).toBe(false);
    }
  });
  it("rejects newlines in one-line fields and unknown segments, and enforces length limits", () => {
    expect(campaignSchema.safeParse({ ...ok, subject: "a\nb" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, name: "a\r\nb" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, segment: "everyone-ever" }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, subject: "x".repeat(151) }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, body: "x".repeat(5001) }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...ok, body: "   " }).success).toBe(false);
  });
  it("allows multi-line bodies", () => {
    expect(campaignSchema.safeParse({ ...ok, body: "line one\n\nline two" }).success).toBe(true);
  });
});

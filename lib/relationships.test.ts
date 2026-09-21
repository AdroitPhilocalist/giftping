import { describe, expect, it } from "vitest";
import { RELATIONSHIPS, getRelationship } from "./relationships";
import { OCCASION_TAGS, RECIPIENT_TAGS } from "./catalog/tags";

describe("relationships", () => {
  it("has unique slugs", () => {
    expect(new Set(RELATIONSHIPS.map((r) => r.slug)).size).toBe(RELATIONSHIPS.length);
  });
  it("only filters by tags vendors can actually choose", () => {
    for (const r of RELATIONSHIPS) {
      const { recipientTag, occasionTag } = r.filter;
      expect(Boolean(recipientTag) !== Boolean(occasionTag)).toBe(true);
      if (recipientTag) expect(RECIPIENT_TAGS).toContain(recipientTag);
      if (occasionTag) expect(OCCASION_TAGS).toContain(occasionTag);
    }
  });
  it("looks up by slug", () => {
    expect(getRelationship("kids")?.title).toBe("For Little Ones");
    expect(getRelationship("nobody")).toBeUndefined();
  });
});

// Controlled vocabularies for the occasion/recipient filters. Shared by the vendor product form (so
// vendors can only pick valid tags) and the storefront filters (so every option actually matches
// something) — a free-text tag field would silently fragment the filters over time.
export const OCCASION_TAGS = ["birthday", "anniversary", "wedding", "housewarming", "thank-you"] as const;
export const RECIPIENT_TAGS = ["for-her", "for-him", "for-parents", "for-kids", "for-colleagues"] as const;

export function labelForTag(tag: string): string {
  const spaced = tag.replace(/^for-/, "For ").replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * An occasion/recipient "world" (Birthday, Anniversary, For Her…) is a category AND a tag with the same name. Inside that world the matching tag filter would only
 * repeat the world's own choice, so the filter panel leaves that group out (the OTHER group stays — "Birthday gifts for him" is useful). Only slugs in the controlled
 * vocabularies qualify.
 *
 * NB: the world lists the products FILED UNDER the category, not everything carrying the tag. Showing the union was tried and reverted: the demo catalogue tags 38
 * of 57 products "birthday", so the union made Birthday World look like the whole shop (8 → 38 gifts). Revisit once real vendors have curated their tags.
 */
export type WorldTag = { kind: "occasion"; tag: string } | { kind: "recipient"; tag: string };

export function worldTagFor(slug: string): WorldTag | null {
  if ((OCCASION_TAGS as readonly string[]).includes(slug)) return { kind: "occasion", tag: slug };
  if ((RECIPIENT_TAGS as readonly string[]).includes(slug)) return { kind: "recipient", tag: slug };
  return null;
}

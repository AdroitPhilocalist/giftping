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
 * An occasion/recipient "world" (Birthday, Anniversary, For Her…) is a category AND a tag with the same name. A shopper walking into the Birthday world expects every
 * birthday gift — not only the products a boutique happened to file under the "Birthday" category — so the world shows the union, and its own tag filter would be a
 * second copy of the same choice. Only slugs in the controlled vocabularies qualify (also what keeps the value safe to place in a PostgREST filter).
 */
export type WorldTag = { kind: "occasion"; tag: string } | { kind: "recipient"; tag: string };

export function worldTagFor(slug: string): WorldTag | null {
  if ((OCCASION_TAGS as readonly string[]).includes(slug)) return { kind: "occasion", tag: slug };
  if ((RECIPIENT_TAGS as readonly string[]).includes(slug)) return { kind: "recipient", tag: slug };
  return null;
}

/** The PostgREST `or` clause for "in this category, or carries the world's tag". */
export function worldOrClause(categoryId: string, world: WorldTag): string {
  const column = world.kind === "occasion" ? "occasion_tags" : "recipient_tags";
  return `category_id.eq.${categoryId},${column}.cs.{${world.tag}}`;
}

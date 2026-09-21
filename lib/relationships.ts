import type { ImageKey } from "./content/imagery";
import type { ProductListFilters } from "./db/products";

/**
 * "Shop by relationship": who the gift is for. Each one is a real product filter over tags vendors already choose (recipient tags where a
 * matching one exists, otherwise the closest occasion), so every card leads to actual products — never an empty promise.
 */
export interface Relationship {
  slug: string;
  label: string;
  title: string;
  line: string;
  imageKey: ImageKey;
  filter: Pick<ProductListFilters, "recipientTag" | "occasionTag">;
}

export const RELATIONSHIPS: Relationship[] = [
  { slug: "parents", label: "Parents", title: "For Parents", line: "Thoughtful ways to say thank you.", imageKey: "rel-parents", filter: { recipientTag: "for-parents" } },
  { slug: "partner", label: "Partner", title: "For Your Partner", line: "Anniversaries and every day in between.", imageKey: "rel-partner", filter: { occasionTag: "anniversary" } },
  { slug: "friends", label: "Friends", title: "For Friends", line: "Birthdays and celebrations worth marking.", imageKey: "rel-friends", filter: { occasionTag: "birthday" } },
  { slug: "colleagues", label: "Colleagues", title: "For Colleagues", line: "Polished, professional, appreciated.", imageKey: "rel-colleagues", filter: { recipientTag: "for-colleagues" } },
  { slug: "kids", label: "Little Ones", title: "For Little Ones", line: "Gifts that make them light up.", imageKey: "rel-kids", filter: { recipientTag: "for-kids" } },
];

export function getRelationship(slug: string): Relationship | undefined {
  return RELATIONSHIPS.find((r) => r.slug === slug);
}

// Controlled vocabularies for the occasion/recipient filters. Shared by the vendor product form (so
// vendors can only pick valid tags) and the storefront filters (so every option actually matches
// something) — a free-text tag field would silently fragment the filters over time.
export const OCCASION_TAGS = ["birthday", "anniversary", "wedding", "housewarming", "thank-you"] as const;
export const RECIPIENT_TAGS = ["for-her", "for-him", "for-parents", "for-kids", "for-colleagues"] as const;

export function labelForTag(tag: string): string {
  const spaced = tag.replace(/^for-/, "For ").replace(/-/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

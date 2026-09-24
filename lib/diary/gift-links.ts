/**
 * Where "Find a gift for Mom" should go: the shop-by-relationship page that fits how the person is described, or the whole mall when nothing fits.
 * (The slugs are those in lib/relationships.ts; they are strings here so this stays a dependency-free, testable rule.)
 */
export function giftsForHref(relationship: string | null | undefined): string {
  const r = (relationship ?? "").toLowerCase();
  if (/\b(mother|mom|mum|father|dad|parent|grand|nani|nana|dadi|dada|in-law)/.test(r)) return "/gifts-for/parents";
  if (/\b(wife|husband|partner|spouse|girlfriend|boyfriend|fianc)/.test(r)) return "/gifts-for/partner";
  if (/\b(friend)/.test(r)) return "/gifts-for/friends";
  if (/\b(colleague|boss|manager|client|coworker|co-worker|mentor)/.test(r)) return "/gifts-for/colleagues";
  if (/\b(son|daughter|child|kid|baby|niece|nephew)/.test(r)) return "/gifts-for/kids";
  return "/categories";
}

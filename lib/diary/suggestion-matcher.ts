import { RECIPIENT_TAGS, OCCASION_TAGS } from "../catalog/tags";

/**
 * Rule-based gift suggestions — no LLM, deliberately (see CLAUDE.md "Ask GiftPing AI"). Pure and unit-tested: give it a person,
 * an occasion and candidate products, get back a ranked shortlist with a plain-English reason for each pick.
 *
 * Scoring (higher is better):
 *   +6  product is tagged for this occasion (birthday, anniversary…)
 *   +4  product is tagged for this kind of recipient (for-her / for-parents…), inferred from the relationship
 *   +3  per interest that appears in the product's tags, name or category (whole-word, case-insensitive), max 3 interests counted
 *   +2  a word from the person's free-text gift preferences appears in the product's tags/name
 *   +2 / −4  price within / above the budget (no budget = neutral);  products far below the budget get no bonus
 *   +0..1.5  rating, weighted by how many reviews back it
 *   excluded  products this person has already been gifted (never suggest the same thing twice)
 */
export type OccasionTag = (typeof OCCASION_TAGS)[number];
export type RecipientTag = (typeof RECIPIENT_TAGS)[number];

export interface SuggestionPerson {
  relationship: string | null;
  interests: string[];
  giftPreferences: string | null;
}
export interface SuggestionContext {
  eventType: string | null;
  budgetMax?: number | null;
}
export interface SuggestionCandidate {
  id: string;
  name: string;
  tags: string[];
  occasionTags: string[];
  recipientTags: string[];
  categoryName?: string | null;
  price: number;
  averageRating: number;
  reviewCount: number;
}
export interface Suggestion {
  productId: string;
  score: number;
  reasons: string[];
}

const RELATIONSHIP_TO_RECIPIENT: [RegExp, RecipientTag[]][] = [
  [/\b(mother|mom|mum|mummy|amma|mata|maa|grandmother|grandma|nani|dadi)\b/i, ["for-parents", "for-her"]],
  [/\b(father|dad|daddy|papa|appa|grandfather|grandpa|nana|dada)\b/i, ["for-parents", "for-him"]],
  [/\b(parent|parents|in-laws?|mother-in-law|father-in-law)\b/i, ["for-parents"]],
  [/\b(wife|girlfriend|fianc[eé]e|sister|daughter|aunt|aunty|niece|bride|her)\b/i, ["for-her"]],
  [/\b(husband|boyfriend|fianc[eé]|brother|son|uncle|nephew|groom|him)\b/i, ["for-him"]],
  [/\b(child|kid|kids|baby|toddler)\b/i, ["for-kids"]],
  [/\b(colleague|coworker|co-worker|boss|manager|client|team|employee|mentor)\b/i, ["for-colleagues"]],
];

export function recipientTagsFor(relationship: string | null): RecipientTag[] {
  if (!relationship) return [];
  const found = new Set<RecipientTag>();
  for (const [pattern, tags] of RELATIONSHIP_TO_RECIPIENT) if (pattern.test(relationship)) tags.forEach((t) => found.add(t));
  return Array.from(found);
}

/** Diary event types -> the storefront's occasion vocabulary. Unknown types (e.g. "graduation") fall back to no occasion signal. */
export function occasionTagFor(eventType: string | null): OccasionTag | null {
  const t = (eventType ?? "").toLowerCase();
  if (t.includes("birth")) return "birthday";
  if (t.includes("anniv")) return "anniversary";
  if (t.includes("wed")) return "wedding";
  if (t.includes("house") || t.includes("home")) return "housewarming";
  if (t.includes("thank")) return "thank-you";
  return null;
}

const words = (text: string) => text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
const wholeWord = (haystackWords: Set<string>, needle: string) => words(needle).some((w) => haystackWords.has(w));

export function suggestGifts(args: {
  person: SuggestionPerson;
  context: SuggestionContext;
  candidates: SuggestionCandidate[];
  alreadyGiftedProductIds?: Set<string>;
  limit?: number;
}): Suggestion[] {
  const { person, context, candidates, alreadyGiftedProductIds } = args;
  const occasion = occasionTagFor(context.eventType);
  const recipientTags = recipientTagsFor(person.relationship);
  const prefWords = new Set(words(person.giftPreferences ?? ""));
  const interests = person.interests.map((i) => i.trim()).filter(Boolean);

  const scored: Suggestion[] = [];
  for (const product of candidates) {
    if (alreadyGiftedProductIds?.has(product.id)) continue;

    let score = 0;
    const reasons: string[] = [];
    const text = new Set([...product.tags.flatMap(words), ...words(product.name), ...words(product.categoryName ?? "")]);

    if (occasion && product.occasionTags.includes(occasion)) {
      score += 6;
      reasons.push(`Great for a ${occasion}`);
    }
    const matchedRecipient = recipientTags.find((t) => product.recipientTags.includes(t));
    if (matchedRecipient) {
      score += 4;
      reasons.push(`Suits ${person.relationship ? `your ${person.relationship.toLowerCase()}` : "them"}`);
    }
    const matchedInterests = interests.filter((i) => wholeWord(text, i)).slice(0, 3);
    if (!matchedRecipient && recipientTags.length > 0 && product.recipientTags.length > 0) {
      if (matchedInterests.length === 0) continue; // clearly meant for someone else
      score -= 3; // an interest match keeps it, but it's a weaker fit
    }
    if (matchedInterests.length > 0) {
      score += 3 * matchedInterests.length;
      reasons.push(`Matches their love of ${matchedInterests.join(", ")}`);
    }
    const prefHit = [...prefWords].find((w) => text.has(w) && !matchedInterests.some((i) => wholeWord(new Set([w]), i)));
    if (prefHit) {
      score += 2;
      reasons.push(`Fits their preferences (${prefHit})`);
    }
    if (context.budgetMax != null && context.budgetMax > 0) {
      if (product.price <= context.budgetMax) {
        score += 2;
        reasons.push("Within your budget");
      } else score -= 4;
    }
    score += Math.min(1.5, (product.averageRating / 5) * Math.min(1, product.reviewCount / 5) * 1.5);

    // A candidate must earn at least one real signal; rating alone never qualifies it.
    if (reasons.length === 0 || reasons.every((r) => r === "Within your budget")) continue;
    scored.push({ productId: product.id, score: Math.round(score * 100) / 100, reasons });
  }

  return scored.sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId)).slice(0, args.limit ?? 6);
}

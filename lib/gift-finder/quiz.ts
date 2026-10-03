import { recipientTagsFor, suggestGifts, type SuggestionCandidate } from "../diary/suggestion-matcher";

/**
 * The gift-finder quiz — pure and tested. Four questions (who, what occasion, how much, what do they love) become a ranked shelf of real products with
 * a plain-English reason on each. The RANKING is the diary's existing rule-based engine (lib/diary/suggestion-matcher.ts) so both features recommend
 * consistently; this module adds the quiz's own vocabulary, strict parsing of the answers from the URL, a hard budget limit, readable reasons, and a
 * "popular picks" fallback so a thin catalogue slice never ends in an empty page.
 *
 * Answers live in the URL (?who=mother&occasion=birthday&budget=2500&likes=flowers,personalised), so a result is shareable and the page is
 * server-rendered. Because the URL is user-controlled, every value is checked against these lists — nothing else is ever used.
 */
export const WHO = [
  { id: "mother", label: "Mom", sub: "Mother", relationship: "mother" },
  { id: "father", label: "Dad", sub: "Father", relationship: "father" },
  { id: "wife", label: "Wife or girlfriend", sub: "", relationship: "wife" },
  { id: "husband", label: "Husband or boyfriend", sub: "", relationship: "husband" },
  { id: "sister", label: "Sister or daughter", sub: "", relationship: "sister" },
  { id: "brother", label: "Brother or son", sub: "", relationship: "brother" },
  { id: "friend", label: "A friend", sub: "", relationship: "friend" },
  { id: "colleague", label: "Colleague or boss", sub: "", relationship: "colleague" },
  { id: "child", label: "A little one", sub: "", relationship: "child" },
] as const;

export const OCCASIONS = [
  { id: "birthday", label: "A birthday", eventType: "birthday" },
  { id: "anniversary", label: "An anniversary", eventType: "anniversary" },
  { id: "wedding", label: "A wedding", eventType: "wedding" },
  { id: "housewarming", label: "A housewarming", eventType: "housewarming" },
  { id: "thank-you", label: "To say thank you", eventType: "thank you" },
  { id: "just-because", label: "Just because", eventType: null },
] as const;

export const BUDGETS = [
  { id: "1000", label: "Up to ₹1,000", max: 1000 },
  { id: "2500", label: "Up to ₹2,500", max: 2500 },
  { id: "5000", label: "Up to ₹5,000", max: 5000 },
  { id: "any", label: "No limit — surprise me", max: null },
] as const;

/** What they love. Each chip stands for a few catalogue words (matched against product tags, names and categories whole-word by the engine). */
export const INTERESTS = [
  { id: "hampers", label: "Hampers & gift boxes", keywords: ["hamper", "giftbox"] },
  { id: "flowers", label: "Flowers", keywords: ["flowers", "bouquet"] },
  { id: "sweets", label: "Chocolates & sweets", keywords: ["chocolate", "sweet"] },
  { id: "jewellery", label: "Jewellery", keywords: ["jewellery"] },
  { id: "personalised", label: "Personalised things", keywords: ["personalised", "engraved", "monogram"] },
  { id: "home", label: "Candles & home", keywords: ["candle", "decor", "lamp"] },
  { id: "stationery", label: "Journals & stationery", keywords: ["journal", "stationery"] },
  { id: "craft", label: "Leather & wood", keywords: ["leather", "wooden"] },
  { id: "luxury", label: "Something luxurious", keywords: ["luxury", "premium"] },
  { id: "festive", label: "Festive treats", keywords: ["diwali"] },
] as const;

export type WhoId = (typeof WHO)[number]["id"];
export type OccasionId = (typeof OCCASIONS)[number]["id"];
export type BudgetId = (typeof BUDGETS)[number]["id"];
export type InterestId = (typeof INTERESTS)[number]["id"];

export interface QuizAnswers {
  who: WhoId;
  occasion: OccasionId;
  budget: BudgetId;
  likes: InterestId[];
}

export const MAX_LIKES = 3;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const has = <T extends { id: string }>(list: readonly T[], id: string | undefined): id is T["id"] => list.some((x) => x.id === id);

/**
 * The answers in a URL's query string. `complete` is true once the three required questions are answered (the interests are optional). Anything not in
 * the lists above is dropped, at most three interests are kept, and repeated or comma-separated `likes` both work.
 */
export function parseQuiz(sp: Record<string, string | string[] | undefined>): { answers: QuizAnswers | null; partial: Partial<QuizAnswers> } {
  const who = one(sp.who);
  const occasion = one(sp.occasion);
  const budget = one(sp.budget);
  const rawLikes = (Array.isArray(sp.likes) ? sp.likes : [sp.likes ?? ""]).flatMap((s) => s.split(","));
  const likes = [...new Set(rawLikes.map((s) => s.trim()).filter((s): s is InterestId => has(INTERESTS, s)))].slice(0, MAX_LIKES);
  const partial: Partial<QuizAnswers> = {
    ...(has(WHO, who) ? { who } : {}),
    ...(has(OCCASIONS, occasion) ? { occasion } : {}),
    ...(has(BUDGETS, budget) ? { budget } : {}),
    likes,
  };
  const complete = Boolean(partial.who && partial.occasion && partial.budget);
  return { answers: complete ? (partial as QuizAnswers) : null, partial };
}

/** The query string for a set of answers (round-trips through parseQuiz). */
export function quizQuery(a: QuizAnswers): string {
  const q = new URLSearchParams({ who: a.who, occasion: a.occasion, budget: a.budget });
  if (a.likes.length > 0) q.set("likes", a.likes.join(","));
  return q.toString();
}

export const labelOf = {
  who: (id: WhoId) => WHO.find((w) => w.id === id)!.label,
  occasion: (id: OccasionId) => OCCASIONS.find((o) => o.id === id)!.label,
  budget: (id: BudgetId) => BUDGETS.find((b) => b.id === id)!.label,
  interest: (id: InterestId) => INTERESTS.find((i) => i.id === id)!.label,
};

export interface Recommendation {
  productId: string;
  score: number;
  reasons: string[];
}

export const MIN_RESULTS = 3;
export const DEFAULT_RESULT_LIMIT = 9;

const KEYWORD_PREFIX = "Matches their love of ";

/**
 * Rank the catalogue for these answers. Steps:
 *  1. budget is a HARD limit (nothing over it is ever shown) — the engine's own budget rule is only a soft penalty, so it is bypassed;
 *  2. the diary engine scores the rest (recipient, occasion, interests) and explains itself;
 *  3. its "matches their love of chocolate, sweet" reason is rewritten to the shopper's own words ("chocolates & sweets, flowers"), in the order they picked;
 *  4. if fewer than MIN_RESULTS qualified, popular picks (best-rated, most-reviewed, within budget, and not meant for someone else) fill the shelf, honestly labelled.
 * Deterministic: equal scores order by id.
 */
export function rankQuiz(args: { answers: QuizAnswers; candidates: SuggestionCandidate[]; limit?: number }): Recommendation[] {
  const limit = Math.max(1, args.limit ?? DEFAULT_RESULT_LIMIT);
  const { answers } = args;
  const who = WHO.find((w) => w.id === answers.who)!;
  const occasion = OCCASIONS.find((o) => o.id === answers.occasion)!;
  const budget = BUDGETS.find((b) => b.id === answers.budget)!;
  // in the order the shopper picked them
  const likeDefs = answers.likes.map((id) => INTERESTS.find((i) => i.id === id)).filter((i): i is (typeof INTERESTS)[number] => Boolean(i));
  const pool = budget.max === null ? args.candidates : args.candidates.filter((c) => c.price <= budget.max);
  const budgetNote = budget.max === null ? [] : ["Within your budget"];

  const ranked: Recommendation[] = suggestGifts({
    person: { relationship: who.relationship, interests: likeDefs.flatMap((i) => [...i.keywords]), giftPreferences: null },
    context: { eventType: occasion.eventType, budgetMax: null },
    candidates: pool,
    limit,
  }).map((s) => ({
    productId: s.productId,
    score: s.score,
    reasons: [
      ...s.reasons.map((r) => {
        if (!r.startsWith(KEYWORD_PREFIX)) return r;
        const matched = r.slice(KEYWORD_PREFIX.length).split(", ");
        const labels = likeDefs.filter((i) => i.keywords.some((k) => matched.includes(k))).map((i) => i.label.toLowerCase());
        return labels.length > 0 ? `${KEYWORD_PREFIX}${labels.join(", ")}` : r;
      }),
      ...budgetNote,
    ],
  }));

  if (ranked.length >= MIN_RESULTS) return ranked;

  // The fallback obeys the same "clearly meant for someone else" rule as the engine: a for-her item never fills the shelf for someone it wasn't made for.
  const wanted = recipientTagsFor(who.relationship);
  const suitsThem = (c: SuggestionCandidate) => wanted.length === 0 || c.recipientTags.length === 0 || c.recipientTags.some((t) => (wanted as string[]).includes(t));
  const taken = new Set(ranked.map((r) => r.productId));
  const popular = pool
    .filter((c) => !taken.has(c.id) && suitsThem(c))
    .map((c) => ({ c, pop: c.averageRating * Math.log2(1 + c.reviewCount) }))
    .sort((a, b) => b.pop - a.pop || a.c.id.localeCompare(b.c.id))
    .map(({ c, pop }) => ({ productId: c.id, score: Math.round(pop * 100) / 100 - 100, reasons: ["Popular with shoppers", ...budgetNote] }));
  return [...ranked, ...popular].slice(0, limit);
}

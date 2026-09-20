/**
 * The "Gifting Score" (0–100): how thoughtfully prepared someone is, shown as a ring on the diary dashboard.
 * A pure, documented function — the numbers below ARE the spec, and the tests pin them.
 *
 *   Preparedness   45  Of the moments in the next 30 days, how many already have a gift ordered? (Nothing coming up = full marks,
 *                      but only once the diary has any events at all — an empty diary must not look "perfectly prepared".)
 *   Knowing them   25  Share of your people you've told us at least one interest for (the better we know them, the better the ideas).
 *   Coverage       15  Share of your people with at least one date saved (a person with no dates can never be reminded).
 *   Consistency    15  Gifts sent in the last 12 months relative to the number of people (one a year each = full marks).
 */
export interface GiftingScoreInput {
  contactCount: number;
  contactsWithInterests: number;
  contactsWithEvents: number;
  eventCount: number;
  /** Moments in the next 30 days, and how many of those already have a gift on order. */
  upcoming30d: { total: number; handled: number };
  giftsLast12Months: number;
}

export interface GiftingScore {
  score: number;
  label: "Just starting" | "Getting there" | "Thoughtful" | "Gifting pro";
  breakdown: { key: "preparedness" | "knowing" | "coverage" | "consistency"; label: string; points: number; max: number }[];
  /** The single most useful next step, in plain words. */
  nextBestAction: string;
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const ratio = (part: number, whole: number) => (whole <= 0 ? 0 : clamp01(part / whole));

export function computeGiftingScore(input: GiftingScoreInput): GiftingScore {
  const preparedness =
    input.eventCount === 0 ? 0 : input.upcoming30d.total === 0 ? 1 : ratio(input.upcoming30d.handled, input.upcoming30d.total);
  const knowing = ratio(input.contactsWithInterests, input.contactCount);
  const coverage = ratio(input.contactsWithEvents, input.contactCount);
  const consistency = ratio(input.giftsLast12Months, input.contactCount);

  const breakdown: GiftingScore["breakdown"] = [
    { key: "preparedness", label: "Ready for what's coming", points: Math.round(preparedness * 45), max: 45 },
    { key: "knowing", label: "Knowing your people", points: Math.round(knowing * 25), max: 25 },
    { key: "coverage", label: "Dates saved", points: Math.round(coverage * 15), max: 15 },
    { key: "consistency", label: "Gifts sent this year", points: Math.round(consistency * 15), max: 15 },
  ];
  const score = Math.min(100, breakdown.reduce((sum, b) => sum + b.points, 0));

  let nextBestAction: string;
  if (input.contactCount === 0) nextBestAction = "Add the first person you love — start with someone whose birthday is coming up.";
  else if (input.contactsWithEvents < input.contactCount) nextBestAction = "Add a birthday or anniversary for everyone, so we can remind you in time.";
  else if (input.upcoming30d.total > input.upcoming30d.handled) nextBestAction = "Pick a gift for your next upcoming moment — we've lined up ideas.";
  else if (input.contactsWithInterests < input.contactCount) nextBestAction = "Add a few interests for each person to get sharper gift ideas.";
  else if (input.giftsLast12Months < input.contactCount) nextBestAction = "Send a surprise — a thank-you or just-because gift builds the habit.";
  else nextBestAction = "You're all set. Keep it up!";

  return {
    score,
    label: score >= 75 ? "Gifting pro" : score >= 50 ? "Thoughtful" : score >= 25 ? "Getting there" : "Just starting",
    breakdown,
    nextBestAction,
  };
}

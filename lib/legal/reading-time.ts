import type { LegalSection } from "@/components/legal/types";

/** Average adult reading speed for prose — the figure used for "about N min read" labels, not a promise. */
const WORDS_PER_MINUTE = 200;

/**
 * Words a reader actually reads: headings, paragraphs and list items. `{ node }` bodies are React elements, whose text can't be
 * read without rendering, so they're skipped — a policy with one or two of them is still accurate to the minute.
 */
export function legalWordCount(sections: LegalSection[]): number {
  let words = 0;
  for (const section of sections) {
    const parts: string[] = [section.heading];
    for (const body of section.body) {
      if (typeof body === "string") parts.push(body);
      else if ("list" in body) parts.push(...body.list);
    }
    for (const part of parts) words += part.trim().match(/\S+/g)?.length ?? 0;
  }
  return words;
}

/** At least 1, so a short policy never claims to be a 0-minute read. */
export function readingMinutes(sections: LegalSection[]): number {
  return Math.max(1, Math.round(legalWordCount(sections) / WORDS_PER_MINUTE));
}

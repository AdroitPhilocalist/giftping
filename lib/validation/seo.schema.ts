import { z } from "zod";
import { SEO_LIMITS } from "../seo/pages";

// Blank → null BEFORE validating and `.nullable()` after, so the schema's own output re-parses as input (the project's Zod v4 lesson).
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
const oneLine = (message: string) => z.string().regex(/^[^\r\n]*$/, message);

export const seoSchema = z.object({
  metaTitle: z.preprocess(blankToNull, oneLine("The title must be one line.").trim().max(SEO_LIMITS.titleMax, `Keep the title under ${SEO_LIMITS.titleMax} characters.`).nullable()),
  metaDescription: z.preprocess(blankToNull, oneLine("The description must be one line.").trim().max(SEO_LIMITS.descriptionMax, `Keep the description under ${SEO_LIMITS.descriptionMax} characters.`).nullable()),
  noindex: z.boolean(),
});

export type SeoInput = z.input<typeof seoSchema>;
export type SeoData = z.output<typeof seoSchema>;

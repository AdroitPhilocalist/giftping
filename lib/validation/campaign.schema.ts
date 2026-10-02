import { z } from "zod";
import { safeCtaUrl } from "../content/banners";
import { SEGMENT_KEYS } from "../marketing/segments";

// Blank → null BEFORE validating, and `.nullable()` after: the schema's own output must re-parse as input (the Zod v4 lesson from
// the profile form — a union with the empty-string literal broke exactly that).
const blankToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

const noNewlines = (message: string) => z.string().regex(/^[^\r\n]*$/, message);

export const campaignSchema = z
  .object({
    name: noNewlines("The name must be one line.").trim().min(1, "Give the campaign a name.").max(120, "Keep the name under 120 characters."),
    // A newline in a subject is the classic email-header injection; refuse it outright rather than silently strip it.
    subject: noNewlines("The subject must be one line.").trim().min(1, "Write a subject line.").max(150, "Keep the subject under 150 characters."),
    preheader: z.preprocess(blankToNull, noNewlines("The preview text must be one line.").trim().max(200, "Keep the preview text under 200 characters.").nullable()),
    body: z.string().trim().min(1, "Write the message.").max(5000, "Keep the message under 5,000 characters."),
    ctaLabel: z.preprocess(blankToNull, noNewlines("The button text must be one line.").trim().max(40, "Keep the button text under 40 characters.").nullable()),
    ctaUrl: z.preprocess(blankToNull, z.string().trim().max(300).nullable()),
    segment: z.enum(SEGMENT_KEYS),
  })
  .superRefine((v, ctx) => {
    if ((v.ctaLabel === null) !== (v.ctaUrl === null)) {
      ctx.addIssue({ code: "custom", path: [v.ctaLabel === null ? "ctaLabel" : "ctaUrl"], message: "Fill in both the button text and its link, or neither." });
      return;
    }
    if (v.ctaUrl !== null && safeCtaUrl(v.ctaUrl) === null) {
      ctx.addIssue({ code: "custom", path: ["ctaUrl"], message: "The link must be a site path like /mall or a full https:// address." });
    }
  })
  .transform((v) => ({ ...v, ctaUrl: v.ctaUrl === null ? null : safeCtaUrl(v.ctaUrl) }));

export type CampaignInput = z.input<typeof campaignSchema>;
export type CampaignData = z.output<typeof campaignSchema>;

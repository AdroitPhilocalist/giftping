import { z } from "zod";

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, "Choose a rating").max(5),
  title: z.string().trim().max(120).nullish().transform((v) => (v ? v : null)),
  body: z.string().trim().min(10, "Say a little more — at least 10 characters").max(2000),
});

export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewData = z.output<typeof reviewSchema>;

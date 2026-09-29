import { z } from "zod";

// Same normalisation as address.schema.ts's phone field: accept "+91 98765 43210", "098765-43210" etc.
// and store the bare 10 digits. Blank is allowed here — unlike a delivery address, a profile phone number
// is optional (the account already has a verified email as its primary contact method). Preprocesses
// straight to null-or-normalised-digits (rather than a union with the literal "") so the schema's own
// OUTPUT re-parses safely as its own INPUT — this form's value is parsed once client-side (react-hook-
// form's zodResolver) and again server-side (updateProfileAction re-validates independently), and a
// union with z.literal("") reports a bare, unhelpful "Invalid input" on that second pass in Zod v4.
const phone = z.preprocess(
  (v) => {
    if (typeof v !== "string") return v;
    const digits = v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, "");
    return digits === "" ? null : digits;
  },
  z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number").nullable(),
);

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(100),
  phone,
});

export type ProfileInput = z.input<typeof profileSchema>;
export type ProfileData = z.output<typeof profileSchema>;

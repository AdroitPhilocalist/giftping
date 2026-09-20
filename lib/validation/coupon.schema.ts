import { z } from "zod";
import { parseISODate } from "@/lib/diary/recurrence";

const optionalNumber = (schema: z.ZodNumber) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v), z.coerce.number().pipe(schema).nullable());

const dateOnly = z.string().refine((v) => parseISODate(v) !== null, "Enter a valid date");
const optionalDate = z.preprocess((v) => (v === "" || v === undefined ? null : v), dateOnly.nullable());
const optionalUuid = z.preprocess((v) => (v === "" || v === undefined ? null : v), z.string().uuid().nullable());

export const couponSchema = z
  .object({
    code: z.string().trim().transform((v) => v.toUpperCase()).pipe(z.string().regex(/^[A-Z0-9_-]{3,30}$/, "Use 3–30 letters, numbers, - or _")),
    description: z.string().trim().max(200).nullish().transform((v) => (v ? v : null)),
    discountType: z.enum(["percentage", "fixed"]),
    discountValue: z.coerce.number().positive("Enter a discount above zero"),
    minOrderAmount: z.preprocess((v) => (v === "" || v == null ? 0 : v), z.coerce.number().min(0, "Can't be negative").max(10_000_000)),
    maxDiscountAmount: optionalNumber(z.number().positive("Must be above zero")),
    usageLimit: optionalNumber(z.number().int("Whole numbers only").min(1, "At least 1")),
    perUserLimit: z.preprocess((v) => (v === "" || v == null ? 1 : v), z.coerce.number().int("Whole numbers only").min(1).max(1000)),
    vendorId: optionalUuid,
    categoryId: optionalUuid,
    validFrom: optionalDate,
    validUntil: optionalDate,
    isActive: z.boolean().default(true),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "percentage" && v.discountValue > 100) ctx.addIssue({ code: "custom", path: ["discountValue"], message: "A percentage can't exceed 100" });
    if (v.discountType === "fixed" && v.maxDiscountAmount !== null) ctx.addIssue({ code: "custom", path: ["maxDiscountAmount"], message: "A cap only applies to percentage coupons" });
    if (v.validFrom && v.validUntil && v.validUntil <= v.validFrom) ctx.addIssue({ code: "custom", path: ["validUntil"], message: "The end date must be after the start date" });
  });

export type CouponInput = z.input<typeof couponSchema>;
export type CouponData = z.output<typeof couponSchema>;

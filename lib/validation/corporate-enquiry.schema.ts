import { z } from "zod";

/**
 * The corporate quote form. Values are short, stable codes so the database CHECK constraints and the
 * admin inbox never depend on the exact marketing wording of a label.
 */
export const CORPORATE_GIFTING_NEEDS = [
  "client_gifting",
  "employee_gifting",
  "onboarding_kits",
  "festive_gifting",
  "recognition_awards",
  "event_merchandise",
  "other",
] as const;

export const CORPORATE_QUANTITY_RANGES = ["under_25", "25_99", "100_249", "250_499", "500_plus", "not_sure"] as const;
export const CORPORATE_BUDGET_RANGES = ["under_1000", "1000_2500", "2500_5000", "5000_plus", "not_sure"] as const;
export const CORPORATE_ENQUIRY_STATUSES = ["new", "contacted", "quoted", "won", "lost"] as const;

export type CorporateGiftingNeed = (typeof CORPORATE_GIFTING_NEEDS)[number];
export type CorporateQuantityRange = (typeof CORPORATE_QUANTITY_RANGES)[number];
export type CorporateBudgetRange = (typeof CORPORATE_BUDGET_RANGES)[number];
export type CorporateEnquiryStatus = (typeof CORPORATE_ENQUIRY_STATUSES)[number];

export const CORPORATE_GIFTING_NEED_LABELS: Record<CorporateGiftingNeed, string> = {
  client_gifting: "Client & partner gifting",
  employee_gifting: "Employee gifting",
  onboarding_kits: "Welcome & onboarding kits",
  festive_gifting: "Festive gifting",
  recognition_awards: "Awards & recognition",
  event_merchandise: "Event & conference kits",
  other: "Something else",
};

export const CORPORATE_QUANTITY_RANGE_LABELS: Record<CorporateQuantityRange, string> = {
  under_25: "Under 25 gifts",
  "25_99": "25–99 gifts",
  "100_249": "100–249 gifts",
  "250_499": "250–499 gifts",
  "500_plus": "500+ gifts",
  not_sure: "Not sure yet",
};

export const CORPORATE_BUDGET_RANGE_LABELS: Record<CorporateBudgetRange, string> = {
  under_1000: "Under ₹1,000 per gift",
  "1000_2500": "₹1,000–₹2,500 per gift",
  "2500_5000": "₹2,500–₹5,000 per gift",
  "5000_plus": "₹5,000+ per gift",
  not_sure: "Not sure yet",
};

export const CORPORATE_ENQUIRY_STATUS_LABELS: Record<CorporateEnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null));

const todayUtc = () => {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
};

/** Empty is allowed. A real date must exist and not be in the past (UTC date comparison, so a timezone can't shift it by a day). */
const optionalFutureDate = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || /^\d{4}-\d{2}-\d{2}$/.test(value), "Enter a valid date")
  .refine((value) => {
    if (value === null) return true;
    const time = Date.parse(`${value}T00:00:00Z`);
    if (!Number.isFinite(time)) return false;
    if (new Date(time).toISOString().slice(0, 10) !== value) return false;
    return time >= todayUtc();
  }, "Choose today or a later date");

export const corporateEnquirySchema = z.object({
  companyName: z.string().trim().min(2, "Enter your company name").max(160, "Keep this under 160 characters"),
  contactName: z.string().trim().min(2, "Enter your name").max(120, "Keep this under 120 characters"),
  workEmail: z.string().trim().toLowerCase().pipe(z.email("Enter a valid work email").max(200, "Keep this under 200 characters")),
  phone: z
    .string()
    .trim()
    .min(7, "Enter a phone number")
    .max(20, "Keep this under 20 characters")
    .regex(/^[+0-9][0-9()\-\s]{6,19}$/, "Enter a valid phone number"),
  giftingNeed: z.enum(CORPORATE_GIFTING_NEEDS, { error: "Choose what you're gifting for" }),
  quantityRange: z.enum(CORPORATE_QUANTITY_RANGES, { error: "Choose an approximate quantity" }),
  budgetRange: z.enum(CORPORATE_BUDGET_RANGES, { error: "Choose a budget range" }),
  deliveryCity: optionalText(120),
  deliveryDate: optionalFutureDate,
  brandingRequirements: optionalText(1000),
  message: optionalText(2000),
  consent: z.boolean().refine((value) => value === true, { message: "Please agree to be contacted about this enquiry" }),
  /** Honeypot — invisible to people, tempting to bots. Never stored. */
  website: z.string().max(200).optional().default(""),
});

export type CorporateEnquiryInput = z.input<typeof corporateEnquirySchema>;
export type CorporateEnquiryData = z.output<typeof corporateEnquirySchema>;

export const corporateEnquiryUpdateSchema = z.object({
  id: z.uuid("That enquiry doesn't look right"),
  status: z.enum(CORPORATE_ENQUIRY_STATUSES, { error: "Choose a status" }),
  internalNote: optionalText(2000),
});

export type CorporateEnquiryUpdate = z.input<typeof corporateEnquiryUpdateSchema>;

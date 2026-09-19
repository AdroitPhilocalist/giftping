import { z } from "zod";

const upper = (s: unknown) => (typeof s === "string" ? s.trim().toUpperCase() : s);

export const BUSINESS_TYPES = [
  "Sole proprietorship",
  "Partnership",
  "Private limited company",
  "LLP",
  "Other",
] as const;

export const vendorApplicationSchema = z.object({
  businessName: z.string().trim().min(2, "Enter your business name").max(120),
  businessType: z.enum(BUSINESS_TYPES),
  shortDescription: z.string().trim().max(120, "Keep the tagline under 120 characters").optional().or(z.literal("")),
  description: z.string().trim().min(20, "Tell shoppers a little about your brand (20+ characters)").max(1500),
  supportEmail: z.email("Enter a valid email address"),
  supportPhone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  gstin: z.preprocess(
    upper,
    z.string().regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid 15-character GSTIN"),
  ),
  pan: z.preprocess(upper, z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)")),
  bankAccountName: z.string().trim().min(2, "Enter the account holder's name").max(120),
  bankAccountNumber: z.string().trim().regex(/^\d{9,18}$/, "Enter a valid account number (9–18 digits)"),
  bankIfsc: z.preprocess(upper, z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC (e.g. HDFC0001234)")),
  warehouseLine1: z.string().trim().min(3, "Enter the pickup address").max(200),
  warehouseCity: z.string().trim().min(2, "Enter the city").max(80),
  warehouseState: z.string().trim().min(2, "Enter the state").max(80),
  warehousePincode: z.string().trim().regex(/^\d{6}$/, "Enter a 6-digit pincode"),
  acceptTerms: z.literal(true, { error: "You need to accept the vendor terms to apply" }),
});

export type VendorApplicationInput = z.input<typeof vendorApplicationSchema>;
export type VendorApplication = z.output<typeof vendorApplicationSchema>;

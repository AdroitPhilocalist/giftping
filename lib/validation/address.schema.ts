import { z } from "zod";

export const INDIAN_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh",
  "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep",
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
  "West Bengal",
] as const;

export const ADDRESS_LABELS = ["Home", "Work", "Other"] as const;

// Accept "+91 98765 43210", "098765-43210" etc. and store the bare 10 digits the DB CHECK expects.
const phone = z.preprocess(
  (v) => (typeof v === "string" ? v.replace(/[\s-]/g, "").replace(/^(\+?91|0)(?=[6-9]\d{9}$)/, "") : v),
  z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
);

const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((v) => (v ? v : null));

export const addressSchema = z.object({
  label: z.enum(ADDRESS_LABELS).default("Home"),
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(100),
  phone,
  addressLine1: z.string().trim().min(3, "Enter the flat / house / street").max(200),
  addressLine2: optionalText(200),
  landmark: optionalText(100),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.enum(INDIAN_STATES, { error: "Choose a state" }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  isDefault: z.boolean().default(false),
});

export type AddressInput = z.input<typeof addressSchema>;
export type AddressData = z.output<typeof addressSchema>;

import { describe, expect, it } from "vitest";
import {
  CORPORATE_BUDGET_RANGE_LABELS,
  CORPORATE_ENQUIRY_STATUSES,
  CORPORATE_GIFTING_NEED_LABELS,
  CORPORATE_QUANTITY_RANGE_LABELS,
  corporateEnquirySchema,
  corporateEnquiryUpdateSchema,
} from "./corporate-enquiry.schema";

const valid = {
  companyName: "Acme India",
  contactName: "Asha Nair",
  workEmail: "Asha@Acme.example",
  phone: "+91 98765 43210",
  giftingNeed: "client_gifting" as const,
  quantityRange: "100_249" as const,
  budgetRange: "2500_5000" as const,
  deliveryCity: "Bengaluru",
  deliveryDate: "",
  brandingRequirements: "Logo engraved on the notebook",
  message: "We'd like these delivered to our office.",
  consent: true as const,
  website: "",
};

describe("corporateEnquirySchema", () => {
  it("accepts a complete brief and normalises the email", () => {
    const result = corporateEnquirySchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.workEmail).toBe("asha@acme.example");
    expect(result.data.deliveryDate).toBeNull();
    expect(result.data.deliveryCity).toBe("Bengaluru");
  });

  it("turns blank optional text into null", () => {
    const result = corporateEnquirySchema.safeParse({ ...valid, deliveryCity: "  ", brandingRequirements: "", message: "" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.deliveryCity).toBeNull();
    expect(result.data.brandingRequirements).toBeNull();
    expect(result.data.message).toBeNull();
  });

  it("requires the key contact details and consent", () => {
    for (const patch of [
      { companyName: "" },
      { contactName: "" },
      { workEmail: "not-an-email" },
      { phone: "123" },
      { consent: false },
    ]) {
      expect(corporateEnquirySchema.safeParse({ ...valid, ...patch }).success).toBe(false);
    }
  });

  it("only accepts the known codes", () => {
    expect(corporateEnquirySchema.safeParse({ ...valid, giftingNeed: "birthday" }).success).toBe(false);
    expect(corporateEnquirySchema.safeParse({ ...valid, quantityRange: "10" }).success).toBe(false);
    expect(corporateEnquirySchema.safeParse({ ...valid, budgetRange: "cheap" }).success).toBe(false);
  });

  it("accepts a real future date and rejects an impossible or past one", () => {
    expect(corporateEnquirySchema.safeParse({ ...valid, deliveryDate: "2999-12-31" }).success).toBe(true);
    expect(corporateEnquirySchema.safeParse({ ...valid, deliveryDate: "2020-01-01" }).success).toBe(false);
    expect(corporateEnquirySchema.safeParse({ ...valid, deliveryDate: "2026-02-31" }).success).toBe(false);
  });

  it("has a label for every stored code", () => {
    for (const value of Object.keys(CORPORATE_GIFTING_NEED_LABELS)) expect(CORPORATE_GIFTING_NEED_LABELS[value as keyof typeof CORPORATE_GIFTING_NEED_LABELS]).toBeTruthy();
    for (const value of Object.keys(CORPORATE_QUANTITY_RANGE_LABELS)) expect(CORPORATE_QUANTITY_RANGE_LABELS[value as keyof typeof CORPORATE_QUANTITY_RANGE_LABELS]).toBeTruthy();
    for (const value of Object.keys(CORPORATE_BUDGET_RANGE_LABELS)) expect(CORPORATE_BUDGET_RANGE_LABELS[value as keyof typeof CORPORATE_BUDGET_RANGE_LABELS]).toBeTruthy();
    expect(CORPORATE_ENQUIRY_STATUSES).toContain("new");
  });
});

describe("corporateEnquiryUpdateSchema", () => {
  it("requires a real id, a known status and bounded note", () => {
    expect(corporateEnquiryUpdateSchema.safeParse({ id: "not-a-uuid", status: "new", internalNote: "" }).success).toBe(false);
    expect(corporateEnquiryUpdateSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", status: "done", internalNote: "" }).success).toBe(false);
    expect(corporateEnquiryUpdateSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", status: "quoted", internalNote: "x".repeat(2001) }).success).toBe(false);
    expect(corporateEnquiryUpdateSchema.safeParse({ id: "11111111-1111-4111-8111-111111111111", status: "quoted", internalNote: "Sent a shortlist." }).success).toBe(true);
  });
});

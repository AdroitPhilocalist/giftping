import { describe, expect, it } from "vitest";
import { profileSchema } from "./profile.schema";

const valid = { fullName: "Asha Nair", phone: "98765 43210" };

describe("profileSchema", () => {
  it("normalises phone formats to 10 digits, same as addressSchema", () => {
    for (const p of ["98765 43210", "+91 98765 43210", "09876543210", "98765-43210", "919876543210"]) {
      const r = profileSchema.safeParse({ ...valid, phone: p });
      expect(r.success && r.data.phone, p).toBe("9876543210");
    }
  });
  it("allows a blank phone (unlike a delivery address, this is optional) and turns it into null", () => {
    const r = profileSchema.safeParse({ ...valid, phone: "" });
    expect(r.success).toBe(true);
    expect(r.success && r.data.phone).toBeNull();
  });
  it("rejects a bad phone", () => {
    expect(profileSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, phone: "5876543210" }).success).toBe(false);
  });
  it("rejects a missing or too-short name", () => {
    expect(profileSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
    expect(profileSchema.safeParse({ ...valid, fullName: "A" }).success).toBe(false);
  });
  it("trims the name", () => {
    const r = profileSchema.safeParse({ ...valid, fullName: "  Asha Nair  " });
    expect(r.success && r.data.fullName).toBe("Asha Nair");
  });
});

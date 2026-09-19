import { describe, expect, it } from "vitest";
import { addressSchema } from "./address.schema";

const valid = {
  recipientName: "Asha Nair",
  phone: "98765 43210",
  addressLine1: "12 Marine Drive",
  city: "Kochi",
  state: "Kerala",
  pincode: "682031",
};

describe("addressSchema", () => {
  it("normalises phone formats to 10 digits", () => {
    for (const p of ["98765 43210", "+91 98765 43210", "09876543210", "98765-43210", "919876543210"]) {
      const r = addressSchema.safeParse({ ...valid, phone: p });
      expect(r.success && r.data.phone, p).toBe("9876543210");
    }
  });
  it("rejects bad phones and pincodes", () => {
    expect(addressSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, phone: "5876543210" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: "012345" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: "68203" }).success).toBe(false);
  });
  it("rejects a state that isn't in India's list", () => {
    expect(addressSchema.safeParse({ ...valid, state: "Atlantis" }).success).toBe(false);
  });
  it("turns empty optional fields into null and survives re-parsing its own output", () => {
    const first = addressSchema.parse({ ...valid, addressLine2: "", landmark: "  " });
    expect(first.addressLine2).toBeNull();
    expect(addressSchema.safeParse(first).success).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { describeDelivery } from "./delivery-estimate";

const today = new Date("2026-09-21T10:00:00+05:30");

describe("describeDelivery", () => {
  it("gives a date when the courier gave a day count", () => {
    const r = describeDelivery({ status: "ok", etdDays: 3, pincode: "682001", today });
    expect(r.tone).toBe("good");
    expect(r.text).toMatch(/about 3 days/);
    expect(r.text).toMatch(/Thu.*24/); // 21 Sept 2026 is a Monday, so +3 days is Thursday the 24th
  });
  it("uses singular for one day and never invents a date without an estimate", () => {
    expect(describeDelivery({ status: "ok", etdDays: 1, pincode: "682001", today }).text).toMatch(/about 1 day —/);
    expect(describeDelivery({ status: "ok", etdDays: null, pincode: "682001", today }).text).toBe("Yes — we deliver to 682001.");
    expect(describeDelivery({ status: "ok", etdDays: 0, pincode: "682001", today }).text).toBe("Yes — we deliver to 682001.");
    expect(describeDelivery({ status: "ok", etdDays: 90, pincode: "682001", today }).text).toBe("Yes — we deliver to 682001.");
  });
  it("says no clearly when unserviceable, and is honest when unknown", () => {
    expect(describeDelivery({ status: "unserviceable", etdDays: null, pincode: "999999" }).tone).toBe("bad");
    const u = describeDelivery({ status: "unknown", etdDays: null, pincode: "682001" });
    expect(u.tone).toBe("neutral");
    expect(u.text).toMatch(/confirm .* at checkout/);
  });
});

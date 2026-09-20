import { describe, expect, it } from "vitest";
import { refundShare, refundableRemaining, returnWindow, suggestRefundAmount } from "./refunds";

describe("refundableRemaining", () => {
  it("is what was paid minus what is already refunded or reserved", () => {
    expect(refundableRemaining({ paid: 999, alreadyRefunded: 250 })).toBe(749);
  });
  it("never goes negative and copes with numeric strings from the database", () => {
    expect(refundableRemaining({ paid: "100.00", alreadyRefunded: "100.00" })).toBe(0);
    expect(refundableRemaining({ paid: 100, alreadyRefunded: 150 })).toBe(0);
  });
});

describe("suggestRefundAmount", () => {
  it("returns the proportional share of a multi-unit line", () => {
    expect(suggestRefundAmount({ paid: 3000, quantity: 3, returnQty: 1, alreadyRefunded: 0, alreadyReturnedQty: 0 })).toBe(1000);
  });
  it("gives the whole remainder when the last unit goes back, so no paisa is stranded", () => {
    const first = suggestRefundAmount({ paid: 100, quantity: 3, returnQty: 1, alreadyRefunded: 0, alreadyReturnedQty: 0 });
    expect(first).toBe(33.33);
    const second = suggestRefundAmount({ paid: 100, quantity: 3, returnQty: 1, alreadyRefunded: first, alreadyReturnedQty: 1 });
    expect(second).toBe(33.33);
    const last = suggestRefundAmount({ paid: 100, quantity: 3, returnQty: 1, alreadyRefunded: first + second, alreadyReturnedQty: 2 });
    expect(last).toBe(33.34);
    expect(first + second + last).toBeCloseTo(100, 2);
  });
  it("uses the discounted amount actually paid, and caps at what is left", () => {
    expect(suggestRefundAmount({ paid: 800, quantity: 2, returnQty: 1, alreadyRefunded: 700, alreadyReturnedQty: 0 })).toBe(100);
  });
  it("is zero for a nonsense quantity", () => {
    expect(suggestRefundAmount({ paid: 800, quantity: 2, returnQty: 0, alreadyRefunded: 0, alreadyReturnedQty: 0 })).toBe(0);
  });
});

describe("refundShare", () => {
  const line = { commission: 100, payout: 900, paid: 1000 };
  it("takes back commission and payout in the refund's proportion", () => {
    expect(refundShare({ ...line, cumulativeRefunded: 400 })).toEqual({ commission: 40, payout: 360 });
  });
  it("a full refund reverses commission and payout entirely", () => {
    expect(refundShare({ ...line, cumulativeRefunded: 1000 })).toEqual({ commission: 100, payout: 900 });
  });
  it("is cumulative, so partial refunds sum to exactly the full amounts", () => {
    const l = { commission: 33.33, payout: 299.99, paid: 333.32 };
    const parts = [111.11, 111.11, 111.1];
    let cum = 0;
    let prev = { commission: 0, payout: 0 };
    let commissionSum = 0;
    let payoutSum = 0;
    for (const p of parts) {
      cum += p;
      const now = refundShare({ ...l, cumulativeRefunded: Math.round(cum * 100) / 100 });
      commissionSum += now.commission - prev.commission;
      payoutSum += now.payout - prev.payout;
      prev = now;
    }
    expect(Math.round(commissionSum * 100) / 100).toBe(33.33);
    expect(Math.round(payoutSum * 100) / 100).toBe(299.99);
  });
  it("cannot exceed the full amounts or go below zero", () => {
    expect(refundShare({ ...line, cumulativeRefunded: 5000 })).toEqual({ commission: 100, payout: 900 });
    expect(refundShare({ ...line, cumulativeRefunded: -5 })).toEqual({ commission: 0, payout: 0 });
    expect(refundShare({ commission: 0, payout: 0, paid: 0, cumulativeRefunded: 10 })).toEqual({ commission: 0, payout: 0 });
  });
});

describe("returnWindow", () => {
  const delivered = "2026-09-10T12:00:00Z";
  it("is open until the window ends and closed after", () => {
    expect(returnWindow({ deliveredAt: delivered, windowDays: 7, now: new Date("2026-09-17T11:59:00Z") }).open).toBe(true);
    expect(returnWindow({ deliveredAt: delivered, windowDays: 7, now: new Date("2026-09-17T12:01:00Z") }).open).toBe(false);
  });
  it("is closed when nothing was delivered", () => {
    expect(returnWindow({ deliveredAt: null, windowDays: 7 })).toEqual({ open: false, closesAt: null });
  });
});

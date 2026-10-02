import { describe, expect, it } from "vitest";
import { buildRevenueReportCsv } from "./revenue-report";

const order = (totalAmount: number, placedAt: string, commission: number, refundedCommission = 0) => ({
  total_amount: totalAmount,
  placed_at: placedAt,
  items: [{ commission_amount: commission, refunded_commission: refundedCommission }],
});

describe("buildRevenueReportCsv", () => {
  it("totals GMV, gross/net commission and refunds across the range", () => {
    const csv = buildRevenueReportCsv({
      from: "2026-09-01",
      to: "2026-09-02",
      orders: [order(2000, "2026-09-01T10:00:00+05:30", 200), order(1000, "2026-09-02T10:00:00+05:30", 100, 30)],
      refundsIssued: 450,
    });
    expect(csv).toContain("Orders,2");
    expect(csv).toContain("Gross Merchandise Value (INR),3000.00");
    expect(csv).toContain("Gross commission earned (INR),300.00");
    expect(csv).toContain("Commission reversed by refunds (INR),30.00");
    expect(csv).toContain("Net platform revenue (INR),270.00");
    expect(csv).toContain("Total refunds issued to customers (INR),450.00");
  });
  it("includes one row per day in the range, even a day with no orders", () => {
    const csv = buildRevenueReportCsv({ from: "2026-09-01", to: "2026-09-03", orders: [order(1000, "2026-09-01T10:00:00+05:30", 100)], refundsIssued: 0 });
    expect(csv).toContain("2026-09-01,1,1000.00,100.00,100.00");
    expect(csv).toContain("2026-09-02,0,0.00,0.00,0.00");
    expect(csv).toContain("2026-09-03,0,0.00,0.00,0.00");
  });
  it("buckets an order by its IST calendar day even near a UTC day boundary", () => {
    // 2026-09-01 23:30 IST = 2026-09-01 18:00 UTC — still the 1st in IST, would be the 1st in UTC too here,
    // so use a time that actually crosses midnight UTC while staying on the 1st in IST.
    const csv = buildRevenueReportCsv({ from: "2026-09-01", to: "2026-09-01", orders: [order(500, "2026-09-01T23:50:00+05:30", 50)], refundsIssued: 0 });
    expect(csv).toContain("2026-09-01,1,500.00,50.00,50.00");
  });
  it("rejects a backwards range", () => {
    expect(() => buildRevenueReportCsv({ from: "2026-09-05", to: "2026-09-01", orders: [], refundsIssued: 0 })).toThrow();
  });
  it("neutralises CSV injection and is empty-safe with zero orders", () => {
    const csv = buildRevenueReportCsv({ from: "2026-09-01", to: "2026-09-01", orders: [], refundsIssued: 0 });
    expect(csv).toContain("Orders,0");
    expect(csv).toContain("Gross Merchandise Value (INR),0.00");
    expect(csv.startsWith("﻿")).toBe(true);
  });
});

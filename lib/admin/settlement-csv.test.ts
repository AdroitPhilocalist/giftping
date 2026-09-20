import { describe, expect, it } from "vitest";
import { buildSettlementCsv, csvCell } from "./settlement-csv";

describe("csvCell", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
  });
  it("neutralises spreadsheet formulas (CSV injection)", () => {
    for (const evil of ["=HYPERLINK(\"http://x\")", "+cmd", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"]) expect(csvCell(evil).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell("Normal product")).toBe("Normal product");
    expect(csvCell("Rose & Co - Gift")).toBe("Rose & Co - Gift"); // a dash INSIDE is fine
  });
  it("writes money as plain 2-decimal numbers", () => {
    expect(csvCell(1234.5)).toBe("1234.50");
    expect(csvCell(0)).toBe("0.00");
    expect(csvCell(Number.NaN)).toBe("");
  });
});

describe("buildSettlementCsv", () => {
  const csv = buildSettlementCsv({
    settlementId: "abc", vendorName: "=EVIL Vendor", status: "settled", paymentReference: "UTR123",
    lines: [
      { orderNumber: "GP-1", deliveredOn: "2026-09-10", productName: "Hamper, large", quantity: 2, customerPaid: 4000, commission: 400, payout: 3600 },
      { orderNumber: "GP-2", deliveredOn: "2026-09-11", productName: "@Gift", quantity: 1, customerPaid: 1000.5, commission: 100.05, payout: 900.45 },
    ],
  });
  it("has a header, one row per line, and a correct total", () => {
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Order,Delivered on,Product,Qty,Customer paid (INR),Platform commission (INR),Payout to vendor (INR)");
    expect(csv).toContain('GP-1,2026-09-10,"Hamper, large",2,4000.00,400.00,3600.00');
    expect(csv).toContain(",,,,,TOTAL PAYOUT,4500.45");
  });
  it("neutralises hostile vendor and product names", () => {
    expect(csv).toContain("Vendor,'=EVIL Vendor");
    expect(csv).toContain("'@Gift");
    expect(csv).not.toMatch(/(^|,)=EVIL/m);
  });
  it("uses CRLF line endings", () => {
    expect(csv.split("\r\n").length).toBeGreaterThan(8);
  });
});

describe("buildSettlementCsv with refund adjustments", () => {
  const csv = buildSettlementCsv({
    settlementId: "abc", vendorName: "V", status: "pending", paymentReference: null,
    lines: [{ orderNumber: "GP-1", deliveredOn: "2026-09-10", productName: "Hamper", quantity: 1, customerPaid: 1000, commission: 100, payout: 900 }],
    adjustments: [{ reason: "Refund on GP-0 — =Bad item", amount: -270 }],
  });
  it("lists each deduction and nets it into the total", () => {
    expect(csv).toContain(",,Refund adjustment: Refund on GP-0 — =Bad item,,,,-270.00");
    expect(csv).toContain(",,,,,TOTAL PAYOUT,630.00");
  });
  it("still total-correct with no adjustments", () => {
    expect(buildSettlementCsv({ settlementId: "a", vendorName: "V", status: "s", paymentReference: null, lines: [] })).toContain("TOTAL PAYOUT,0.00");
  });
});


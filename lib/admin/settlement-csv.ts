/**
 * Settlement statement as CSV — pure and unit-tested. Two things matter here beyond commas and quotes:
 *  - CSV injection: a cell starting with = + - @ (or tab/CR) is executed as a FORMULA by Excel/Sheets. Product names come from vendors, so every text cell is
 *    neutralised with a leading apostrophe.
 *  - Money is written as plain numbers with 2 decimals (no ₹, no thousands separators) so accountants can sum the column.
 */
export interface SettlementLine {
  orderNumber: string;
  deliveredOn: string;
  productName: string;
  quantity: number;
  customerPaid: number;
  commission: number;
  payout: number;
}

const DANGEROUS_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number): string {
  if (typeof value === "number") return Number.isFinite(value) ? value.toFixed(2) : "";
  let s = value;
  if (DANGEROUS_START.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildSettlementCsv(args: {
  settlementId: string;
  vendorName: string;
  status: string;
  paymentReference: string | null;
  lines: SettlementLine[];
}): string {
  const header = ["Order", "Delivered on", "Product", "Qty", "Customer paid (INR)", "Platform commission (INR)", "Payout to vendor (INR)"];
  const rows = args.lines.map((l) => [l.orderNumber, l.deliveredOn, l.productName, String(l.quantity), l.customerPaid, l.commission, l.payout]);
  const total = args.lines.reduce((sum, l) => sum + l.payout, 0);
  const lines = [
    [`Settlement ${args.settlementId}`],
    ["Vendor", args.vendorName],
    ["Status", args.status],
    ["Payment reference", args.paymentReference ?? ""],
    [],
    header,
    ...rows,
    ["", "", "", "", "", "TOTAL PAYOUT", total],
  ];
  // CRLF + BOM: opens cleanly in Excel with rupee-free numerics and non-ASCII product names intact.
  return "﻿" + lines.map((r) => r.map((c) => csvCell(c as string | number)).join(",")).join("\r\n") + "\r\n";
}

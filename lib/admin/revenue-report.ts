import { addDays, daysBetween, type ISODate } from "@/lib/diary/recurrence";
import { csvCell } from "@/lib/admin/settlement-csv";

/**
 * The platform-wide financial report (spec 5.5: "gross merchandise value, total commissions earned, refunds
 * issued, and net platform revenue for any date range") — pure and unit-tested, like settlement-csv.ts's
 * buildSettlementCsv. The platform's only revenue is commission, so "net platform revenue" is commission
 * EARNED minus the commission portion later reversed by refunds — shown as three separate lines (gross
 * commission, reversed by refunds, net) rather than one, since a real accounting report should show the
 * clawback, not just the end result. "Refunds issued" is the full amount paid back to customers (most of
 * which is the vendor's own payout, not platform money) — a different, larger figure, included because the
 * spec names it separately and because an admin reading this report needs to see total cash that left the
 * platform, not just the commission lost.
 */
export interface RevenueReportOrder {
  total_amount: number | string;
  /** ISO timestamp */
  placed_at: string;
  items: { commission_amount: number | string; refunded_commission: number | string }[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function buildRevenueReportCsv(args: {
  from: ISODate;
  to: ISODate;
  orders: RevenueReportOrder[];
  /** total amount refunded to customers in the period (payments.amount + refunds.amount — the same figure the admin dashboard calls "Refunded") */
  refundsIssued: number;
  timeZone?: string;
}): string {
  const days = daysBetween(args.from, args.to) + 1;
  if (days < 1) throw new Error("`to` must be on or after `from`");
  const tz = args.timeZone ?? "Asia/Kolkata";
  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));

  const daily = new Map<ISODate, { orders: number; gmv: number; grossCommission: number; reversedCommission: number }>();
  for (let i = 0; i < days; i++) { const d = addDays(args.from, i); daily.set(d, { orders: 0, gmv: 0, grossCommission: 0, reversedCommission: 0 }); }

  let gmv = 0, grossCommission = 0, reversedCommission = 0;
  for (const order of args.orders) {
    const total = Number(order.total_amount);
    gmv += total;
    const orderGross = order.items.reduce((s, i) => s + Number(i.commission_amount), 0);
    const orderReversed = order.items.reduce((s, i) => s + Number(i.refunded_commission), 0);
    grossCommission += orderGross;
    reversedCommission += orderReversed;
    const bucket = daily.get(dayOf(order.placed_at));
    if (bucket) { bucket.orders += 1; bucket.gmv += total; bucket.grossCommission += orderGross; bucket.reversedCommission += orderReversed; }
  }
  const netCommission = grossCommission - reversedCommission;

  // Order counts are written as strings (like buildSettlementCsv's "Qty" column) — csvCell formats every
  // NUMBER as 2-decimal money, which would turn a count of 1 into "1.00".
  const lines: (string | number)[][] = [
    ["GiftPing — Platform Revenue Report"],
    ["From", args.from],
    ["To", args.to],
    ["Generated", new Date().toISOString()],
    [],
    ["Orders", String(args.orders.length)],
    ["Gross Merchandise Value (INR)", r2(gmv)],
    ["Gross commission earned (INR)", r2(grossCommission)],
    ["Commission reversed by refunds (INR)", r2(reversedCommission)],
    ["Net platform revenue (INR)", r2(netCommission)],
    ["Total refunds issued to customers (INR)", r2(args.refundsIssued)],
    [],
    ["Date", "Orders", "GMV (INR)", "Gross commission (INR)", "Net commission (INR)"],
    ...[...daily.entries()].map(([date, d]) => [date, String(d.orders), r2(d.gmv), r2(d.grossCommission), r2(d.grossCommission - d.reversedCommission)]),
  ];
  // CRLF + BOM: opens cleanly in Excel, same as buildSettlementCsv.
  return "﻿" + lines.map((row) => row.map((c) => csvCell(c)).join(",")).join("\r\n") + "\r\n";
}

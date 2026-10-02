import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { fetchAllRows } from "@/lib/db/paginate";
import { PAID_ORDER_STATUSES } from "@/lib/db/admin-stats";
import { buildRevenueReportCsv } from "@/lib/admin/revenue-report";
import { addDays, parseISODate } from "@/lib/diary/recurrence";

export const dynamic = "force-dynamic";
// order_item_financials is a strict 1:1 (its PK is the order_item's own id), but Supabase's nested select
// still returns it as an array in some shapes — same unwrap already used in lib/db/admin-stats.ts and the
// settlement CSV route for this exact relation.
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * The platform revenue report download (spec 5.5) — a plain GET so the admin's date-range form
 * (app/admin/dashboard/page.tsx) works without any JavaScript, same as every other filter in this app.
 * Admin-only: enforced here directly (there's no RLS row to hide behind for a cross-vendor aggregate like
 * this one, unlike the settlement CSV route, which relies on RLS because a vendor may legitimately fetch
 * their OWN settlement).
 */
export async function GET(req: Request) {
  const user = await getServerUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Admin access required." }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const from = parseISODate(searchParams.get("from") ?? "");
  const to = parseISODate(searchParams.get("to") ?? "");
  if (!from || !to) return NextResponse.json({ error: "Give a valid from and to date." }, { status: 400 });
  const fromDate = searchParams.get("from")!;
  const toDate = searchParams.get("to")!;
  if (fromDate > toDate) return NextResponse.json({ error: "`to` must be on or after `from`." }, { status: 400 });

  // IST calendar days -> a half-open UTC timestamp range, same convention as lib/db/admin-stats.ts.
  const since = `${fromDate}T00:00:00+05:30`;
  const until = `${addDays(toDate, 1)}T00:00:00+05:30`;

  const supabase = await createClient();
  // Paged rather than one big .limit(): PostgREST clamps a response to its max-rows setting (1,000 by default) without
  // saying so, which would have made a busy month's report quietly under-count. A range too large to page is refused
  // outright — a financial report that is silently incomplete is worse than none.
  const MAX_ROWS = 50000;
  let orders, cancelRefunds, lineRefunds;
  try {
    [orders, cancelRefunds, lineRefunds] = await Promise.all([
      fetchAllRows(
        (a, b) =>
          supabase
            .from("orders")
            .select("total_amount, placed_at, items:order_items ( financials:order_item_financials ( commission_amount, refunded_commission ) )")
            .in("status", PAID_ORDER_STATUSES)
            .gte("placed_at", since)
            .lt("placed_at", until)
            .order("placed_at", { ascending: true })
            .order("id", { ascending: true })
            .range(a, b),
        { maxRows: MAX_ROWS },
      ),
      fetchAllRows(
        (a, b) =>
          supabase.from("payments").select("amount").eq("status", "refunded").or("refund_reason.is.null,refund_reason.neq.Fully refunded by line refunds").gte("refunded_at", since).lt("refunded_at", until).order("id", { ascending: true }).range(a, b),
        { maxRows: MAX_ROWS },
      ),
      fetchAllRows(
        (a, b) => supabase.from("refunds").select("amount").eq("status", "processed").gte("processed_at", since).lt("processed_at", until).order("id", { ascending: true }).range(a, b),
        { maxRows: MAX_ROWS },
      ),
    ]);
  } catch (error) {
    console.error("Revenue report query failed", error);
    return NextResponse.json({ error: "Couldn't load the report." }, { status: 500 });
  }
  if (orders.truncated || cancelRefunds.truncated || lineRefunds.truncated) {
    return NextResponse.json({ error: "That range has too many records to export in one go — pick a shorter date range." }, { status: 413 });
  }

  const refundsIssued = [...cancelRefunds.rows, ...lineRefunds.rows].reduce((sum, p) => sum + Number(p.amount), 0);
  const csv = buildRevenueReportCsv({
    from: fromDate,
    to: toDate,
    refundsIssued,
    orders: orders.rows.map((o) => ({
      total_amount: o.total_amount,
      placed_at: o.placed_at as string,
      items: o.items.map((i) => ({ commission_amount: one(i.financials)?.commission_amount ?? 0, refunded_commission: one(i.financials)?.refunded_commission ?? 0 })),
    })),
  });

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="giftping-revenue-${fromDate}-to-${toDate}.csv"`,
      "cache-control": "no-store",
    },
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { buildSettlementCsv } from "@/lib/admin/settlement-csv";

export const dynamic = "force-dynamic";
const one = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? (v[0] ?? null) : (v ?? null));

/**
 * Settlement statement download. Allowed for the admin and for the vendor that owns the settlement — enforced by ROW-LEVEL SECURITY, not by this route:
 * it reads with the caller's own session, so anyone else simply gets a 404 (no confirmation the id exists).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const supabase = await createClient();
  const { data: s } = await supabase.from("vendor_settlements").select("id, status, payment_reference, vendor:vendors ( business_name )").eq("id", id).maybeSingle();
  if (!s) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: lines } = await supabase
    .from("order_item_financials")
    .select("commission_amount, vendor_payout, item:order_items ( order_id, product_name, quantity, total_price, discount_amount, order:orders ( order_number ) )")
    .eq("settlement_id", id);
  const orderIds = Array.from(new Set((lines ?? []).map((l) => one(l.item)?.order_id).filter((x): x is string => !!x)));
  const { data: delivered } = orderIds.length
    ? await supabase.from("shipments").select("order_id, delivered_at").eq("status", "delivered").in("order_id", orderIds)
    : { data: [] as { order_id: string; delivered_at: string | null }[] };
  const deliveredByOrder = new Map((delivered ?? []).map((d) => [d.order_id, d.delivered_at]));
  const istDay = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date(iso)) : "");

  const csv = buildSettlementCsv({
    settlementId: s.id,
    vendorName: one(s.vendor)?.business_name ?? "",
    status: s.status === "failed" ? "voided" : s.status,
    paymentReference: s.payment_reference,
    lines: (lines ?? []).map((l) => {
      const item = one(l.item);
      const order = one(item?.order);
      return {
        orderNumber: order?.order_number ?? "",
        deliveredOn: istDay(item?.order_id ? deliveredByOrder.get(item.order_id) : null),
        productName: item?.product_name ?? "",
        quantity: item?.quantity ?? 0,
        customerPaid: Number(item?.total_price ?? 0) - Number(item?.discount_amount ?? 0),
        commission: Number(l.commission_amount),
        payout: Number(l.vendor_payout),
      };
    }),
  });
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="settlement-${s.id.slice(0, 8)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

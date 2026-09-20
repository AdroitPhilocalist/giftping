import { NextResponse } from "next/server";
import { AuthError, requireRole } from "@/lib/auth/session";
import { csvCell } from "@/lib/admin/settlement-csv";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { buildTemplateRows } from "@/lib/vendor/product-csv";
import { importCategories } from "@/lib/vendor/product-import";

export const dynamic = "force-dynamic";

/** The spreadsheet template: the header plus two example products that use this marketplace's real category names. Approved vendors only. */
export async function GET() {
  try {
    const user = await requireRole("vendor", "admin");
    const vendor = await getMyVendor(user.id);
    if (!vendor || vendor.status !== "approved") return NextResponse.json({ error: "Not allowed." }, { status: 403 });

    const categories = await importCategories();
    const rows = buildTemplateRows(categories.map((c) => c.name));
    // csvCell quotes/escapes properly; the leading BOM + CRLF make it open cleanly in Excel
    const body = "﻿" + rows.map((r) => r.map((cell) => csvCell(cell)).join(",")).join("\r\n") + "\r\n";
    return new NextResponse(body, {
      headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="giftping-products-template.csv"', "cache-control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: "Not allowed." }, { status: error.code === "UNAUTHENTICATED" ? 401 : 403 });
    console.error("[product-template]", error);
    return NextResponse.json({ error: "Couldn't build the template." }, { status: 500 });
  }
}

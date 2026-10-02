import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron/authorised";
import { createAdminClient } from "@/lib/db/admin";
import { runDiaryReminders } from "@/lib/diary/reminders";
import { runPriceDropAlerts } from "@/lib/wishlist/price-drop-job";

// Vercel Cron calls this with `Authorization: Bearer $CRON_SECRET`. Always dynamic; allow the long-running batch.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(request: Request) {
  if (!cronAuthorised(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  const dryRun = url.searchParams.get("dryRun") === "1";
  const started = Date.now();
  const admin = createAdminClient();

  // Independent jobs: one failing must not stop the others.
  const result: Record<string, unknown> = {};
  try {
    result.diary = await runDiaryReminders({ appUrl, dryRun });
  } catch (error) {
    console.error("diary reminders failed", error);
    result.diary = { error: String((error as Error).message ?? error) };
  }
  try {
    result.priceDrops = await runPriceDropAlerts({ dryRun });
  } catch (error) {
    console.error("price-drop alerts failed", error);
    result.priceDrops = { error: String((error as Error).message ?? error) };
  }
  if (!dryRun) {
    const stale = await admin.rpc("cancel_stale_unpaid_orders", { p_hours: 48 });
    result.staleOrdersCancelled = stale.error ? { error: stale.error.message } : stale.data;
    const carts = await admin.rpc("purge_stale_guest_carts", { p_days: 30 });
    result.guestCartsPurged = carts.error ? { error: carts.error.message } : carts.data;
  }
  result.dryRun = dryRun;
  result.tookMs = Date.now() - started;
  console.log("cron:diary-reminders", JSON.stringify(result));
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;

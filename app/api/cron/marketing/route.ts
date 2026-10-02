import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/cron/authorised";
import { processCampaigns } from "@/lib/marketing/sender";

// Sends what the daily/monthly budget allows for every campaign that is `sending`. Its own route (not folded into the diary job) so it can
// run on its own schedule — daily is plenty on the free email tier, which only permits a small batch a day anyway; on a paid plan with
// higher limits, run it more often in vercel.json. Safe to call repeatedly: it claims recipients before sending and respects the budget.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function handle(request: Request) {
  if (!cronAuthorised(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  try {
    const report = await processCampaigns();
    console.log("cron:marketing", JSON.stringify(report));
    return NextResponse.json({ ...report, tookMs: Date.now() - started });
  } catch (error) {
    console.error("cron:marketing failed", error);
    return NextResponse.json({ error: String((error as Error).message ?? error) }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;

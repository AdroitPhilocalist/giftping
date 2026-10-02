import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp, searchRateLimit } from "@/lib/auth/rate-limit";
import { EMPTY_SUGGESTIONS, normaliseSuggestQuery } from "@/lib/search/suggest";
import { getSuggestions } from "@/lib/search/suggestions";

export const dynamic = "force-dynamic";

/** Search-as-you-type. Public (the catalogue is), so it is throttled per IP; a throttled or failed lookup is just "no suggestions". */
export async function GET(request: Request) {
  const q = normaliseSuggestQuery(new URL(request.url).searchParams.get("q"));
  if (!q) return NextResponse.json(EMPTY_SUGGESTIONS);

  const limited = await checkRateLimit(searchRateLimit, getClientIp(request));
  if (!limited.success) return NextResponse.json({ error: "Slow down a little." }, { status: 429 });

  try {
    return NextResponse.json(await getSuggestions(q), { headers: { "cache-control": "private, max-age=30" } });
  } catch (error) {
    console.error("Search suggestions failed", error);
    return NextResponse.json({ error: "Couldn't load suggestions." }, { status: 500 });
  }
}

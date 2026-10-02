import { NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/marketing/unsubscribe";

export const dynamic = "force-dynamic";

/**
 * Unsubscribe from marketing email. Two callers, one rule (the signed token in the URL is the only credential — no login needed):
 *  - a mail app's own "Unsubscribe" button (RFC 8058 one-click): POSTs here with `List-Unsubscribe=One-Click`, expects a 2xx, nothing more.
 *  - the confirm page's button: a form POST with `from=page`; we then redirect back to the page to show the result.
 * A GET never changes anything (link scanners and prefetchers fetch URLs) — it just forwards to the confirm page.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const token = url.searchParams.get("t") ?? (typeof form?.get("t") === "string" ? (form!.get("t") as string) : null);
  const fromPage = form?.get("from") === "page";

  const result = await unsubscribeByToken(token, fromPage ? "unsubscribe_link" : "one_click");
  if (fromPage) {
    const target = new URL("/unsubscribe", url.origin);
    if (result.ok) target.searchParams.set("done", "1");
    else target.searchParams.set("error", result.reason);
    return NextResponse.redirect(target, 303);
  }
  if (result.ok) return NextResponse.json({ ok: true });
  return NextResponse.json({ error: "This unsubscribe link isn't valid." }, { status: result.reason === "unavailable" ? 503 : 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const target = new URL("/unsubscribe", url.origin);
  const t = url.searchParams.get("t");
  if (t) target.searchParams.set("t", t);
  return NextResponse.redirect(target, 303);
}

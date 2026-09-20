import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildDataExportEmail } from "@/lib/notifications/templates";

export const dynamic = "force-dynamic";

const MAX_PER_HOUR = 3;

/**
 * "Download my data" (DPDP right of access). POST only, and only for the SIGNED-IN person's own id — there is no id in the request. POST (not GET) so another
 * site can't make a visitor's browser trigger it: session cookies aren't sent on cross-site POSTs. Throttled from the audit log itself (works without Redis),
 * every download is audit-logged (no personal data in the log) and the account holder is told, so a hijacked session can't quietly copy their data.
 */
export async function POST() {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await admin.from("audit_logs").select("id", { count: "exact", head: true }).eq("actor_id", user.id).eq("action", "account.data_exported").gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return NextResponse.json({ error: "You've downloaded your data a few times in the last hour. Please try again a little later." }, { status: 429 });

  const { data, error } = await admin.rpc("export_user_data", { p_user_id: user.id });
  const result = data as { result: string; data?: unknown } | null;
  if (error || !result) {
    console.error("export_user_data failed", error);
    return NextResponse.json({ error: "We couldn't prepare your data. Please try again." }, { status: 500 });
  }
  if (result.result !== "ok") return NextResponse.json({ error: "There's no data to export for this account." }, { status: 404 });

  await admin.from("audit_logs").insert({ actor_id: user.id, action: "account.data_exported", entity_type: "user", entity_id: user.id, before_data: null, after_data: null });

  const base = appBaseUrl();
  await notifyUser({
    userId: user.id,
    category: "order_updates",
    type: "data_exported",
    title: "A copy of your data was downloaded",
    message: "If this wasn't you, change your password right away.",
    linkUrl: "/account",
    push: false,
    email: buildDataExportEmail({
      firstName: (user.fullName ?? "there").split(" ")[0],
      whenLabel: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST",
      accountUrl: `${base}/account`,
      preferencesUrl: `${base}/account/notifications`,
    }),
  });

  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(result.data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="giftping-my-data-${day}.json"`,
      "cache-control": "no-store",
    },
  });
}

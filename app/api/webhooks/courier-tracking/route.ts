import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { applyTrackingWebhook } from "@/lib/commerce/shipments";
import { shiprocketWebhookSecret } from "@/lib/integrations/shiprocket";
import { parseTrackingPayload } from "@/lib/integrations/shiprocket-webhook";

// The path deliberately avoids the words "shiprocket"/"kartrocket"/"sr"/"kr": Shiprocket's webhook settings reject callback
// URLs containing them. Always dynamic — this is state, never cache it.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512 * 1024;

/** Constant-time compare that doesn't leak the secret's length (both sides hashed to a fixed size first). */
function tokenMatches(received: string | null, expected: string): boolean {
  if (!expected || !received) return false; // an unset secret must never validate anything
  const a = createHash("sha256").update(received).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Courier tracking -> us. Shiprocket authenticates by sending the token you configure as an `x-api-key` header.
 * Order: verify token -> parse -> claim (idempotency) -> apply. apply_shipment_update() is itself idempotent
 * (timeline events dedupe) and monotonic (a status never moves backwards), so out-of-order or repeated deliveries are safe.
 */
export async function POST(request: Request) {
  if (!tokenMatches(request.headers.get("x-api-key"), shiprocketWebhookSecret())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = parseTrackingPayload(body);
  if (!parsed) return NextResponse.json({ ok: true, ignored: true }); // e.g. Shiprocket's connectivity test ping

  const admin = createAdminClient();
  const eventId = `sr:${createHash("sha256").update(parsed.dedupeKey).digest("hex").slice(0, 40)}`;
  const { data: claimed } = await admin
    .from("webhook_events")
    .upsert(
      { id: eventId, provider: "shiprocket", event_type: parsed.rawStatus || "tracking", payment_id: null, gateway_order_id: parsed.awb, status: "processing" },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");

  if (!claimed || claimed.length === 0) {
    const { data: existing } = await admin.from("webhook_events").select("status").eq("id", eventId).maybeSingle();
    if (existing?.status === "processed") return NextResponse.json({ ok: true, duplicate: true });
  }

  try {
    const outcome = await applyTrackingWebhook(body);
    await admin
      .from("webhook_events")
      .update({ status: "processed", result: outcome.result, error: null, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ ok: true, result: outcome.result });
  } catch (error) {
    console.error("Tracking webhook failed", eventId, error);
    await admin
      .from("webhook_events")
      .update({ status: "failed", error: String((error as Error).message ?? error).slice(0, 500) })
      .eq("id", eventId);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

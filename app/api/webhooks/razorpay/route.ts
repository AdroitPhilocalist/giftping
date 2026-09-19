import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/db/admin";
import { razorpayWebhookSecret } from "@/lib/integrations/razorpay";
import { verifyWebhookSignature } from "@/lib/integrations/razorpay-signature";
import { processWebhookEvent, type RazorpayWebhookEvent } from "@/lib/commerce/payments";

// Webhooks are the source of truth for payment state, so this must run on every delivery, never be cached.
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

/**
 * Razorpay -> us. Order of operations matters:
 *   1. read the RAW body (the signature covers the exact bytes — never re-serialised JSON)
 *   2. verify the HMAC signature in constant time; anything unsigned/forged is rejected before it is parsed
 *   3. claim the event id (idempotency): a replay of an already-processed event returns 200 and does nothing
 *   4. process; on failure answer 5xx so Razorpay retries — confirm_order_payment() is idempotent, so a retry is safe
 */
export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret: razorpayWebhookSecret() })) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof event.event !== "string") return NextResponse.json({ error: "Invalid event" }, { status: 400 });

  const eventId = request.headers.get("x-razorpay-event-id");
  if (!eventId) return NextResponse.json({ error: "Missing event id" }, { status: 400 });

  const admin = createAdminClient();
  const payment = event.payload?.payment?.entity;

  // Claim the event. `ignoreDuplicates` turns a replay into "no row inserted".
  const { data: claimed } = await admin
    .from("webhook_events")
    .upsert(
      {
        id: eventId,
        provider: "razorpay",
        event_type: event.event,
        payment_id: payment?.id ?? null,
        gateway_order_id: payment?.order_id ?? event.payload?.order?.entity?.id ?? null,
        status: "processing",
      },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .select("id");

  if (!claimed || claimed.length === 0) {
    const { data: existing } = await admin.from("webhook_events").select("status").eq("id", eventId).maybeSingle();
    if (existing?.status === "processed") return NextResponse.json({ ok: true, duplicate: true });
    // 'processing' (concurrent delivery) or 'failed' (earlier attempt): fall through and process again — safe, it's idempotent.
  }

  try {
    const result = await processWebhookEvent(event);
    await admin
      .from("webhook_events")
      .update({ status: "processed", result, error: null, processed_at: new Date().toISOString() })
      .eq("id", eventId);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("Razorpay webhook processing failed", eventId, error);
    await admin
      .from("webhook_events")
      .update({ status: "failed", error: String((error as Error).message ?? error).slice(0, 500) })
      .eq("id", eventId);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

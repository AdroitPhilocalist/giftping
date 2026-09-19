import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Pure HMAC checks for Razorpay — kept free of env/IO so they're trivially unit-testable.
 *  - Checkout callback:  HMAC_SHA256(`${razorpay_order_id}|${razorpay_payment_id}`, KEY_SECRET)
 *  - Webhook:            HMAC_SHA256(rawRequestBody, WEBHOOK_SECRET)   (the raw bytes, not re-serialised JSON)
 * Both are lower-case hex and compared in constant time.
 */
function hmacHex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

function safeEqualHex(expectedHex: string, receivedHex: string | null | undefined): boolean {
  if (!receivedHex || !/^[0-9a-fA-F]+$/.test(receivedHex)) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const received = Buffer.from(receivedHex, "hex");
  // timingSafeEqual throws on unequal lengths, so the length check must come first.
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function verifyCheckoutSignature(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string | null | undefined;
  keySecret: string;
}): boolean {
  if (!args.keySecret) return false;
  return safeEqualHex(hmacHex(args.keySecret, `${args.razorpayOrderId}|${args.razorpayPaymentId}`), args.signature);
}

export function verifyWebhookSignature(args: {
  rawBody: string;
  signature: string | null | undefined;
  webhookSecret: string;
}): boolean {
  if (!args.webhookSecret) return false; // an unset secret must never validate anything
  return safeEqualHex(hmacHex(args.webhookSecret, args.rawBody), args.signature);
}

/** Test helper / mock-gateway helper. */
export function signWebhookBody(rawBody: string, webhookSecret: string): string {
  return hmacHex(webhookSecret, rawBody);
}

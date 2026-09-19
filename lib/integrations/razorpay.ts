import "server-only";

/**
 * Thin Razorpay REST client (plain fetch + Basic auth — no SDK, one fewer dependency to audit).
 * Amounts are always integer PAISE. Nothing here decides what an order costs: callers pass the server-stored total.
 */

// A test-only escape hatch for pointing at a local mock gateway. Ignored in production so a stray env var can
// never redirect real payment traffic.
function apiBase(): string {
  const override = process.env.RAZORPAY_API_BASE;
  return process.env.NODE_ENV !== "production" && override ? override.replace(/\/$/, "") : "https://api.razorpay.com";
}

export function razorpayCredentials(): { keyId: string; keySecret: string } | null {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_SECRET_KEY;
  return keyId && keySecret ? { keyId, keySecret } : null;
}

export function isRazorpayConfigured(): boolean {
  return razorpayCredentials() !== null;
}

export function razorpayWebhookSecret(): string {
  return process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
}

export class RazorpayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "RazorpayError";
  }
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<T> {
  const creds = razorpayCredentials();
  if (!creds) throw new RazorpayError(503, "NOT_CONFIGURED", "Razorpay is not configured");

  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON error page */
  }
  if (!response.ok) {
    const err = (json as { error?: { code?: string; description?: string } } | null)?.error;
    throw new RazorpayError(response.status, err?.code ?? "GATEWAY_ERROR", err?.description ?? `Razorpay returned ${response.status}`);
  }
  return json as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string | null;
  status: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  error_description?: string | null;
}

export function createRazorpayOrder(args: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return call<RazorpayOrder>("/v1/orders", {
    method: "POST",
    body: { amount: args.amountPaise, currency: "INR", receipt: args.receipt, notes: args.notes ?? {} },
  });
}

export function fetchRazorpayPayment(paymentId: string) {
  return call<RazorpayPayment>(`/v1/payments/${encodeURIComponent(paymentId)}`, { method: "GET" });
}

/** Only needed when the account isn't set to auto-capture: an "authorized" payment is not money yet. */
export function captureRazorpayPayment(paymentId: string, amountPaise: number) {
  return call<RazorpayPayment>(`/v1/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    body: { amount: amountPaise, currency: "INR" },
  });
}

export function refundRazorpayPayment(paymentId: string, amountPaise: number, reason: string) {
  return call<{ id: string; status: string }>(`/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: { amount: amountPaise, speed: "normal", notes: { reason } },
  });
}

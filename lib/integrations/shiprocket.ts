import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { interpretServiceability, type ServiceabilityResult } from "./shiprocket-serviceability";

/**
 * Shiprocket REST client (plain fetch, no SDK). Field names follow Shiprocket's public API docs; they were written
 * without a live account and are exercised only against a local mock — see docs/progress/2026-09-19-stage-8-delivery.md
 * "First real test" before relying on them.
 *
 * Auth: POST /auth/login returns a JWT valid for ~10 days. It's cached in the `integration_tokens` table so every
 * serverless instance shares one login instead of each cold start logging in again.
 */

// Test-only override so a local mock gateway can stand in; ignored in production so a stray env var can't redirect traffic.
function apiBase(): string {
  const override = process.env.SHIPROCKET_API_BASE;
  return (process.env.NODE_ENV !== "production" && override ? override : "https://apiv2.shiprocket.in/v1/external").replace(/\/$/, "");
}

export function isShiprocketConfigured(): boolean {
  return Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD);
}

export function shiprocketWebhookSecret(): string {
  return process.env.SHIPROCKET_WEBHOOK_SECRET ?? "";
}

export class ShiprocketError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ShiprocketError";
  }
}

const PROVIDER = "shiprocket";
const TOKEN_LIFETIME_MS = 9 * 24 * 60 * 60 * 1000; // Shiprocket tokens last 10 days; renew a day early
const REFRESH_MARGIN_MS = 60 * 60 * 1000;

async function loginRequest(): Promise<string> {
  const response = await fetch(`${apiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.SHIPROCKET_EMAIL, password: process.env.SHIPROCKET_PASSWORD }),
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const json = (await response.json().catch(() => null)) as { token?: string; message?: string } | null;
  if (!response.ok || !json?.token) throw new ShiprocketError(response.status, json?.message ?? "Shiprocket login failed");

  await createAdminClient()
    .from("integration_tokens")
    .upsert({ provider: PROVIDER, token: json.token, expires_at: new Date(Date.now() + TOKEN_LIFETIME_MS).toISOString(), updated_at: new Date().toISOString() });
  return json.token;
}

// Single-flight: several requests in one instance (e.g. one serviceability lookup per vendor, in parallel) that all find
// no valid token share ONE login instead of each logging in (logins are rate-limited, and a new login can invalidate the old token).
let loginInFlight: Promise<string> | null = null;
function login(): Promise<string> {
  loginInFlight ??= loginRequest().finally(() => {
    loginInFlight = null;
  });
  return loginInFlight;
}

async function storedToken(): Promise<string | null> {
  const { data } = await createAdminClient().from("integration_tokens").select("token, expires_at").eq("provider", PROVIDER).maybeSingle();
  return data && new Date(data.expires_at).getTime() - Date.now() > REFRESH_MARGIN_MS ? data.token : null;
}

async function getToken(rejected?: string): Promise<string> {
  if (!isShiprocketConfigured()) throw new ShiprocketError(503, "Shiprocket is not configured");
  const stored = await storedToken();
  // If Shiprocket rejected `rejected`, a different stored token means another request/instance already refreshed it.
  if (stored && stored !== rejected) return stored;
  return login();
}

async function call<T>(path: string, init: { method: "GET" | "POST"; body?: unknown }, rejectedToken?: string): Promise<T> {
  const token = await getToken(rejectedToken);
  const response = await fetch(`${apiBase()}${path}`, {
    method: init.method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  // An expired/revoked token: refresh once, then retry.
  if (response.status === 401 && !rejectedToken) return call<T>(path, init, token);

  const text = await response.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }
  if (!response.ok) {
    const message = (json as { message?: string } | null)?.message ?? `Shiprocket returned ${response.status}`;
    throw new ShiprocketError(response.status, message);
  }
  return json as T;
}

// ---------------------------------------------------------------------------
// Serviceability
// ---------------------------------------------------------------------------

export type { ServiceabilityResult } from "./shiprocket-serviceability";

export async function fetchServiceability(args: {
  pickupPincode: string;
  deliveryPincode: string;
  weightKg: number;
}): Promise<ServiceabilityResult> {
  const qs = new URLSearchParams({
    pickup_postcode: args.pickupPincode,
    delivery_postcode: args.deliveryPincode,
    weight: String(Math.max(0.1, args.weightKg)),
    cod: "0",
  });
  try {
    return interpretServiceability(await call<unknown>(`/courier/serviceability/?${qs}`, { method: "GET" }));
  } catch (error) {
    // Some routes answer with a 404 instead of an empty 200; both mean "no courier serves this route".
    if (error instanceof ShiprocketError && error.status === 404) {
      return { serviceable: false, etdDays: null, courierCount: 0, standardEtdDays: null, expressEtdDays: null, expressCourierId: null };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Booking
// ---------------------------------------------------------------------------

export interface PickupLocationInput {
  name: string; // the label orders reference; must be unique in the Shiprocket account
  contactName: string;
  email: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
}

export async function addPickupLocation(input: PickupLocationInput) {
  return call<{ success?: boolean; pickup_id?: number; message?: string }>("/settings/company/addpickup", {
    method: "POST",
    body: {
      pickup_location: input.name,
      name: input.contactName,
      email: input.email,
      phone: input.phone,
      address: input.addressLine1,
      city: input.city,
      state: input.state,
      country: "India",
      pin_code: input.pincode,
    },
  });
}

export interface ShiprocketOrderInput {
  orderId: string; // unique per shipment: `${orderNumber}-${vendor suffix}`
  orderDate: string; // YYYY-MM-DD HH:mm
  pickupLocation: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: { line1: string; line2: string | null; city: string; state: string; pincode: string };
  items: { name: string; sku: string; units: number; sellingPrice: number; taxRate: number; hsn: string | null }[];
  subTotal: number;
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export async function createShiprocketOrder(input: ShiprocketOrderInput) {
  const [first, ...rest] = input.customerName.trim().split(/\s+/);
  const json = await call<{ order_id?: number; shipment_id?: number; status?: string; message?: string }>("/orders/create/adhoc", {
    method: "POST",
    body: {
      order_id: input.orderId,
      order_date: input.orderDate,
      pickup_location: input.pickupLocation,
      billing_customer_name: first || input.customerName,
      billing_last_name: rest.join(" "),
      billing_address: input.address.line1,
      billing_address_2: input.address.line2 ?? "",
      billing_city: input.address.city,
      billing_pincode: input.address.pincode,
      billing_state: input.address.state,
      billing_country: "India",
      billing_email: input.customerEmail,
      billing_phone: input.customerPhone,
      shipping_is_billing: true,
      order_items: input.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        units: i.units,
        selling_price: i.sellingPrice,
        discount: 0,
        tax: i.taxRate,
        hsn: i.hsn ?? "",
      })),
      payment_method: "Prepaid",
      sub_total: input.subTotal,
      length: input.lengthCm,
      breadth: input.breadthCm,
      height: input.heightCm,
      weight: input.weightKg,
    },
  });
  if (!json.shipment_id) throw new ShiprocketError(502, json.message ?? "Shiprocket did not return a shipment id");
  return { shiprocketOrderId: String(json.order_id ?? ""), shipmentId: String(json.shipment_id) };
}

export interface ShiprocketReturnOrderInput {
  orderId: string; // unique per return shipment
  orderDate: string; // YYYY-MM-DD HH:mm
  /** Where the courier collects FROM — the customer's own delivery address for this order. */
  pickup: { name: string; email: string; phone: string; address: { line1: string; line2: string | null; city: string; state: string; pincode: string } };
  /** Where the courier delivers TO — the vendor's registered warehouse. */
  dropoff: { name: string; email: string; phone: string; address: { line1: string; city: string; state: string; pincode: string } };
  items: { name: string; sku: string; units: number; sellingPrice: number; taxRate: number; hsn: string | null }[];
  subTotal: number;
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

/**
 * Reverse pickup: /orders/create/return mirrors /orders/create/adhoc in shape, but swaps which side is which —
 * the "pickup" fields are where the courier collects from (the customer) and the "shipping" fields are where it's
 * delivered (the vendor's warehouse) — the exact reverse of a forward order. NOTE: built from Shiprocket's
 * documented field pattern (the same pickup/shipping/order_items/payment_method shape confirmed real for the
 * adhoc endpoint in this file) — but unlike adhoc orders and serviceability checks, this specific endpoint has
 * never been called against the real account (doing so creates a real return order with real consequences, the
 * same category of action the pickup-request step in bookShipment() is deliberately careful about). Treat the
 * exact field names as unverified until a real call confirms them.
 */
export async function createShiprocketReturnOrder(input: ShiprocketReturnOrderInput) {
  const [pFirst, ...pRest] = input.pickup.name.trim().split(/\s+/);
  const json = await call<{ order_id?: number; shipment_id?: number; status?: string; message?: string }>("/orders/create/return", {
    method: "POST",
    body: {
      order_id: input.orderId,
      order_date: input.orderDate,
      pickup_customer_name: pFirst || input.pickup.name,
      pickup_last_name: pRest.join(" "),
      pickup_address: input.pickup.address.line1,
      pickup_address_2: input.pickup.address.line2 ?? "",
      pickup_city: input.pickup.address.city,
      pickup_state: input.pickup.address.state,
      pickup_country: "India",
      pickup_pincode: input.pickup.address.pincode,
      pickup_email: input.pickup.email,
      pickup_phone: input.pickup.phone,
      shipping_customer_name: input.dropoff.name,
      shipping_address: input.dropoff.address.line1,
      shipping_city: input.dropoff.address.city,
      shipping_state: input.dropoff.address.state,
      shipping_country: "India",
      shipping_pincode: input.dropoff.address.pincode,
      shipping_email: input.dropoff.email,
      shipping_phone: input.dropoff.phone,
      order_items: input.items.map((i) => ({
        name: i.name,
        sku: i.sku,
        units: i.units,
        selling_price: i.sellingPrice,
        discount: 0,
        tax: i.taxRate,
        hsn: i.hsn ?? "",
      })),
      payment_method: "PREPAID",
      sub_total: input.subTotal,
      length: input.lengthCm,
      breadth: input.breadthCm,
      height: input.heightCm,
      weight: input.weightKg,
    },
  });
  if (!json.shipment_id) throw new ShiprocketError(502, json.message ?? "Shiprocket did not return a shipment id");
  return { shiprocketOrderId: String(json.order_id ?? ""), shipmentId: String(json.shipment_id) };
}

/**
 * `preferredCourierId` (from an Express delivery-speed selection at checkout) asks Shiprocket to use that specific
 * courier instead of letting it auto-pick; omitted, it auto-picks as before. The preference was captured at
 * checkout time and may no longer be valid by the time a vendor actually dispatches (days or weeks later) — callers
 * should retry without it on failure rather than treat a stale preference as a hard block (see lib/vendor/dispatch.ts).
 */
export async function assignAwb(shipmentId: string, preferredCourierId?: number | null) {
  const json = await call<{
    awb_assign_status?: number;
    response?: { data?: { awb_code?: string; courier_name?: string } };
    message?: string;
  }>("/courier/assign/awb", { method: "POST", body: { shipment_id: shipmentId, ...(preferredCourierId ? { courier_id: preferredCourierId } : {}) } });
  const data = json.response?.data;
  if (!data?.awb_code) throw new ShiprocketError(502, json.message ?? "No courier could be assigned");
  return { awb: data.awb_code, courierName: data.courier_name ?? null };
}

export async function generatePickup(shipmentId: string) {
  return call<{ pickup_status?: number; response?: { pickup_scheduled_date?: string } }>("/courier/generate/pickup", {
    method: "POST",
    body: { shipment_id: [shipmentId] },
  });
}

/** Public tracking page for an AWB. */
export function trackingUrl(awb: string) {
  return `https://shiprocket.co/tracking/${encodeURIComponent(awb)}`;
}

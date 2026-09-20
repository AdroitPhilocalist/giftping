import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { notifyUser } from "@/lib/notifications/notify";
import type { ReturnReason } from "@/lib/commerce/refunds";

/**
 * A customer's return requests. Every check (is this your order, is it delivered, is the window still open, how many units are left, is one
 * already open) is made by the atomic create_return_request() SQL function; the caller only supplies the signed-in user's id, never one from the client.
 */
export type ReturnResult = { ok: true; id?: string } | { ok: false; error: string };

export async function getReturnWindowDays(): Promise<number> {
  const { data } = await createAdminClient().from("platform_settings").select("value").eq("key", "return_window_days").maybeSingle();
  const n = Number(data?.value ?? 7);
  return Number.isFinite(n) && n >= 0 ? n : 7;
}

export async function submitReturnRequest(args: { customerId: string; orderItemId: string; quantity: number; reason: ReturnReason; details: string }): Promise<ReturnResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("create_return_request", {
    p_customer_id: args.customerId, p_order_item_id: args.orderItemId, p_quantity: args.quantity, p_reason: args.reason, p_details: args.details,
  });
  if (error) {
    console.error("create_return_request failed", error);
    return { ok: false, error: "We couldn't send your request. Please try again." };
  }
  const r = data as { result: string; id?: string; vendor_id?: string; order_number?: string; product_name?: string; window_days?: number; available?: number };
  switch (r.result) {
    case "not_found": return { ok: false, error: "We couldn't find that item in your orders." };
    case "not_delivered": return { ok: false, error: "You can request a return once the item has been delivered." };
    case "window_closed": return { ok: false, error: `The ${r.window_days}-day return window for this item has ended. Contact us if something is wrong.` };
    case "bad_quantity": return { ok: false, error: r.available ? `You can return up to ${r.available} of this item.` : "There's nothing left to return on this item." };
    case "already_refunded": return { ok: false, error: "This item has already been fully refunded." };
    case "already_open": return { ok: false, error: "You already have a return request open for this item." };
    case "created": break;
    default: return { ok: false, error: "We couldn't send your request." };
  }

  // tell the boutique and the admins (in-app + push; best effort — notifyUser never throws)
  const { data: vendor } = await admin.from("vendors").select("user_id").eq("id", r.vendor_id!).single();
  if (vendor?.user_id) {
    await notifyUser({
      userId: vendor.user_id, category: "vendor_updates", type: "vendor_return_requested", title: "A customer asked to return an item",
      message: `${r.order_number}: ${r.product_name}. GiftPing will review it — no action needed from you yet.`, linkUrl: "/vendor/returns", push: false,
    });
  }
  const { data: admins } = await admin.from("users").select("id").eq("role", "admin").eq("is_active", true);
  for (const a of admins ?? []) {
    await notifyUser({
      userId: a.id, category: "order_updates", type: "admin_return_requested", title: "New return request",
      message: `${r.order_number}: ${r.product_name}`, linkUrl: "/admin/returns",
    });
  }
  return { ok: true, id: r.id };
}

export async function cancelReturnRequest(args: { customerId: string; returnId: string }): Promise<ReturnResult> {
  const { data, error } = await createAdminClient().rpc("cancel_return_request", { p_id: args.returnId, p_customer_id: args.customerId });
  if (error) return { ok: false, error: "Couldn't cancel the request. Please try again." };
  const r = (data as { result: string }).result;
  if (r === "cancelled") return { ok: true };
  if (r === "not_cancellable") return { ok: false, error: "This request has already been reviewed, so it can't be cancelled." };
  return { ok: false, error: "Request not found." };
}

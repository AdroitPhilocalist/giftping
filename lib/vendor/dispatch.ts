import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildShipmentEmail } from "@/lib/notifications/templates";
import {
  ShiprocketError,
  addPickupLocation,
  assignAwb,
  createShiprocketOrder,
  generatePickup,
  isShiprocketConfigured,
  trackingUrl,
} from "@/lib/integrations/shiprocket";

/**
 * Vendor fulfilment: accept an order, then book a courier pickup with Shiprocket. Everything runs with the service
 * role AFTER the caller (lib/vendor/fulfilment-actions.ts) has proven the signed-in user owns `vendorId`; each query
 * is additionally scoped to that vendor, so a vendor can only ever touch their own lines of an order.
 *
 * Booking is a saga of external calls that can fail halfway, so it is RESUMABLE: the shipments row is claimed first
 * (a partial unique index allows only one live shipment per vendor per order), every id Shiprocket returns is saved as
 * soon as we have it, and a retry skips the steps already done instead of creating a second Shiprocket order.
 */

export const DEFAULT_PACKAGE = { weightGrams: 500, lengthCm: 20, breadthCm: 15, heightCm: 10 };
const DEFAULT_ITEM_WEIGHT_GRAMS = 500;
const PAID_STATES = ["confirmed", "processing", "partially_shipped", "partially_delivered"];

export interface DispatchResult {
  error?: string;
  awb?: string;
  warning?: string;
}

export interface PackageInput {
  weightGrams: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}

export async function acceptOrder(vendorId: string, orderId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data: order } = await admin.from("orders").select("status").eq("id", orderId).maybeSingle();
  if (!order || !PAID_STATES.includes(order.status)) return { error: "This order isn't ready to be accepted." };

  const { data, error } = await admin
    .from("order_items")
    .update({ fulfilment_status: "confirmed" })
    .eq("order_id", orderId)
    .eq("vendor_id", vendorId)
    .eq("fulfilment_status", "pending")
    .select("id");
  if (error) return { error: "Couldn't accept the order. Please try again." };
  if (!data || data.length === 0) return { error: "There's nothing waiting to be accepted on this order." };
  return {};
}

export async function bookShipment(args: { vendorId: string; orderId: string; pkg: PackageInput }): Promise<DispatchResult> {
  if (!isShiprocketConfigured()) return { error: "Courier booking isn't switched on yet." };
  const admin = createAdminClient();
  const { vendorId, orderId, pkg } = args;

  const { data: order } = await admin
    .from("orders")
    .select("id, order_number, status, customer_id, delivery_address, placed_at")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || !PAID_STATES.includes(order.status)) return { error: "This order isn't ready to ship." };

  const { data: items } = await admin
    .from("order_items")
    .select("id, product_id, product_name, quantity, unit_price, total_price, discount_amount, gst_rate, hsn_code, fulfilment_status")
    .eq("order_id", orderId)
    .eq("vendor_id", vendorId);
  if (!items || items.length === 0) return { error: "You have no items on this order." };
  if (items.some((i) => i.fulfilment_status === "pending")) return { error: "Accept the order first." };

  const [{ data: vendor }, { data: priv }, { data: customer }] = await Promise.all([
    admin.from("vendors").select("business_name, slug, support_email, support_phone, user_id").eq("id", vendorId).single(),
    admin.from("vendor_private").select("warehouse_address, shiprocket_pickup_location").eq("vendor_id", vendorId).single(),
    admin.from("users").select("email").eq("id", order.customer_id).single(),
  ]);
  if (!vendor || !priv) return { error: "Vendor profile incomplete." };

  // ---- 1. claim (or resume) the shipment row
  const packageColumns = {
    package_weight_grams: pkg.weightGrams,
    package_length_cm: pkg.lengthCm,
    package_breadth_cm: pkg.breadthCm,
    package_height_cm: pkg.heightCm,
  };
  let { data: shipment } = await admin
    .from("shipments")
    .select("id, shiprocket_order_id, shiprocket_shipment_id, awb_number")
    .eq("order_id", orderId)
    .eq("vendor_id", vendorId)
    .eq("is_return", false)
    .neq("status", "cancelled")
    .maybeSingle();

  if (shipment?.awb_number) return { error: "A courier is already booked for this order.", awb: shipment.awb_number };

  if (!shipment) {
    const { data: created, error } = await admin
      .from("shipments")
      .insert({ order_id: orderId, vendor_id: vendorId, status: "pending", ...packageColumns })
      .select("id, shiprocket_order_id, shiprocket_shipment_id, awb_number")
      .single();
    if (error || !created) {
      return { error: error?.code === "23505" ? "This shipment is already being booked." : "Couldn't start the booking. Please try again." };
    }
    shipment = created;
  } else {
    await admin.from("shipments").update(packageColumns).eq("id", shipment.id);
  }
  const shipmentRowId = shipment.id;

  try {
    // ---- 2. pickup location (the vendor's warehouse, registered once with Shiprocket)
    let pickupName = priv.shiprocket_pickup_location;
    if (!pickupName) {
      const wh = priv.warehouse_address as { line1?: string; city?: string; state?: string; pincode?: string } | null;
      const phone = (vendor.support_phone ?? "").replace(/\D/g, "").slice(-10);
      if (!wh?.line1 || !wh.city || !wh.state || !wh.pincode) throw new ShiprocketError(400, "Your warehouse address is incomplete.");
      if (phone.length !== 10) throw new ShiprocketError(400, "Add a 10-digit support phone number to your vendor profile.");

      pickupName = `GP-${vendor.slug}`.slice(0, 36);
      await addPickupLocation({
        name: pickupName,
        contactName: vendor.business_name,
        email: vendor.support_email ?? customer?.email ?? "",
        phone,
        addressLine1: wh.line1,
        city: wh.city,
        state: wh.state,
        pincode: wh.pincode,
      });
      await admin.from("vendor_private").update({ shiprocket_pickup_location: pickupName }).eq("vendor_id", vendorId);
    }

    // ---- 3. the Shiprocket order (skipped on a resume that already got this far)
    let shiprocketShipmentId = shipment.shiprocket_shipment_id;
    if (!shiprocketShipmentId) {
      const addr = order.delivery_address as {
        recipient_name: string; phone: string; address_line1: string; address_line2: string | null; city: string; state: string; pincode: string;
      };
      const subTotal = items.reduce((sum, i) => sum + Number(i.total_price) - Number(i.discount_amount), 0);
      const created = await createShiprocketOrder({
        orderId: `${order.order_number}-${vendor.slug}`.slice(0, 50),
        // Shiprocket reads this as IST wall-clock time ("YYYY-MM-DD HH:mm").
        orderDate: new Date(order.placed_at ?? Date.now()).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16),
        pickupLocation: pickupName,
        customerName: addr.recipient_name,
        customerEmail: customer?.email ?? "",
        customerPhone: addr.phone,
        address: { line1: addr.address_line1, line2: addr.address_line2, city: addr.city, state: addr.state, pincode: addr.pincode },
        items: items.map((i) => ({
          name: i.product_name,
          sku: (i.product_id ?? i.id).slice(0, 8),
          units: i.quantity,
          sellingPrice: Number(i.unit_price),
          taxRate: Number(i.gst_rate),
          hsn: i.hsn_code,
        })),
        subTotal: Math.round(subTotal * 100) / 100,
        weightKg: pkg.weightGrams / 1000,
        lengthCm: pkg.lengthCm,
        breadthCm: pkg.breadthCm,
        heightCm: pkg.heightCm,
      });
      shiprocketShipmentId = created.shipmentId;
      await admin
        .from("shipments")
        .update({ shiprocket_order_id: created.shiprocketOrderId, shiprocket_shipment_id: created.shipmentId })
        .eq("id", shipmentRowId);
    }

    // ---- 4. courier + AWB
    const { awb, courierName } = await assignAwb(shiprocketShipmentId);
    await admin
      .from("shipments")
      .update({ awb_number: awb, courier_name: courierName, tracking_url: trackingUrl(awb), status: "confirmed" })
      .eq("id", shipmentRowId);

    // ---- 5. ask the courier to collect (best effort: the AWB is already ours, a failed pickup request can be retried)
    let warning: string | undefined;
    try {
      await generatePickup(shiprocketShipmentId);
    } catch (error) {
      console.error("Pickup generation failed", error);
      warning = "Courier booked, but the pickup request didn't go through — the courier may still collect it, or you can arrange it from your Shiprocket panel.";
    }

    const base = appBaseUrl();
    const { data: buyer } = await admin.from("users").select("full_name").eq("id", order.customer_id).single();
    await notifyUser({
      userId: order.customer_id,
      category: "order_updates",
      type: "shipment_booked",
      title: "Your gift is packed",
      message: `${vendor.business_name} has packed your items for order ${order.order_number}${courierName ? ` — ${courierName}, tracking ${awb}` : ""}.`,
      linkUrl: `/orders/${order.id}`,
      email: buildShipmentEmail({
        kind: "booked",
        firstName: (buyer?.full_name ?? "there").split(" ")[0],
        orderNumber: order.order_number,
        vendorName: vendor.business_name,
        courier: courierName,
        awb,
        trackingUrl: trackingUrl(awb),
        orderUrl: `${base}/orders/${order.id}`,
        preferencesUrl: `${base}/account/notifications`,
      }),
    });

    return { awb, warning };
  } catch (error) {
    console.error("Shipment booking failed", error);
    const message = error instanceof ShiprocketError ? error.message : "Something went wrong talking to the courier.";
    // Nothing usable was created yet: free the claim so the vendor can start again cleanly.
    const { data: row } = await admin.from("shipments").select("shiprocket_shipment_id, awb_number").eq("id", shipmentRowId).single();
    if (row && !row.shiprocket_shipment_id && !row.awb_number) await admin.from("shipments").delete().eq("id", shipmentRowId);
    return { error: `${message} You can try again.` };
  }
}

export function defaultWeightGrams(items: { quantity: number; weight_grams: number | null }[]): number {
  return Math.max(
    100,
    items.reduce((sum, i) => sum + (i.weight_grams ?? DEFAULT_ITEM_WEIGHT_GRAMS) * i.quantity, 0),
  );
}

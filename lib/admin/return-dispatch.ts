import "server-only";
import { createAdminClient } from "@/lib/db/admin";
import { appBaseUrl, notifyUser } from "@/lib/notifications/notify";
import { buildReturnUpdateEmail } from "@/lib/notifications/templates";
import {
  ShiprocketError,
  assignAwb,
  createShiprocketReturnOrder,
  generatePickup,
  isShiprocketConfigured,
  trackingUrl,
} from "@/lib/integrations/shiprocket";
import { DEFAULT_PACKAGE, defaultWeightGrams, type DispatchResult } from "@/lib/vendor/dispatch";

/**
 * Admin-initiated reverse pickup for an APPROVED return request: GiftPing arranges the pickup, not the boutique —
 * `/vendor/returns` is deliberately read-only ("You don't need to do anything here"), matching how `decideReturn()`
 * already tells the customer "we'll arrange the pickup" without anything actually booking it until now.
 *
 * Same resumable-saga shape as lib/vendor/dispatch.ts's bookShipment(): claim a shipments row (is_return = true)
 * first, save each Shiprocket id as soon as it exists, and a retry skips steps already done. Pickup is the
 * customer's own delivery address for this order; drop-off is the vendor's registered warehouse — the exact
 * reverse of a forward shipment.
 */
export async function bookReturnPickup(args: { returnRequestId: string; adminId: string }): Promise<DispatchResult> {
  if (!isShiprocketConfigured()) return { error: "Courier booking isn't switched on yet." };
  const admin = createAdminClient();

  const { data: ret } = await admin
    .from("return_requests")
    .select("id, status, order_id, order_item_id, vendor_id, quantity")
    .eq("id", args.returnRequestId)
    .maybeSingle();
  if (!ret) return { error: "Return request not found." };
  if (ret.status !== "approved") return { error: "Approve the return first." };

  const [{ data: order }, { data: item }, { data: vendor }, { data: priv }] = await Promise.all([
    admin.from("orders").select("id, order_number, customer_id, delivery_address, placed_at").eq("id", ret.order_id).single(),
    admin.from("order_items").select("product_id, product_name, unit_price, gst_rate, hsn_code").eq("id", ret.order_item_id).single(),
    admin.from("vendors").select("business_name, slug, support_email, support_phone").eq("id", ret.vendor_id).single(),
    admin.from("vendor_private").select("warehouse_address").eq("vendor_id", ret.vendor_id).single(),
  ]);
  if (!order || !item || !vendor || !priv) return { error: "Couldn't load everything needed to book this pickup." };

  const { data: customer } = await admin.from("users").select("email").eq("id", order.customer_id).single();
  const { data: product } = item.product_id ? await admin.from("products").select("weight_grams").eq("id", item.product_id).maybeSingle() : { data: null };

  const wh = priv.warehouse_address as { line1?: string; city?: string; state?: string; pincode?: string } | null;
  const vendorPhone = (vendor.support_phone ?? "").replace(/\D/g, "").slice(-10);
  if (!wh?.line1 || !wh.city || !wh.state || !wh.pincode) return { error: "This boutique's warehouse address is incomplete." };
  if (vendorPhone.length !== 10) return { error: "This boutique needs a 10-digit support phone number on file." };

  // ---- 1. claim (or resume) the return shipment row
  let { data: shipment } = await admin
    .from("shipments")
    .select("id, shiprocket_order_id, shiprocket_shipment_id, awb_number")
    .eq("order_id", ret.order_id)
    .eq("vendor_id", ret.vendor_id)
    .eq("is_return", true)
    .neq("status", "cancelled")
    .maybeSingle();

  if (shipment?.awb_number) return { error: "A return pickup is already booked for this item.", awb: shipment.awb_number };

  const pkg = DEFAULT_PACKAGE;
  if (!shipment) {
    const { data: created, error } = await admin
      .from("shipments")
      .insert({
        order_id: ret.order_id, vendor_id: ret.vendor_id, status: "pending", is_return: true,
        package_weight_grams: defaultWeightGrams([{ quantity: ret.quantity, weight_grams: product?.weight_grams ?? null }]),
        package_length_cm: pkg.lengthCm, package_breadth_cm: pkg.breadthCm, package_height_cm: pkg.heightCm,
      })
      .select("id, shiprocket_order_id, shiprocket_shipment_id, awb_number")
      .single();
    if (error || !created) {
      return { error: error?.code === "23505" ? "This pickup is already being booked." : "Couldn't start the booking. Please try again." };
    }
    shipment = created;
  }
  const shipmentRowId = shipment.id;

  try {
    // ---- 2. the Shiprocket return order (skipped on a resume that already got this far)
    let shiprocketShipmentId = shipment.shiprocket_shipment_id;
    if (!shiprocketShipmentId) {
      const addr = order.delivery_address as {
        recipient_name: string; phone: string; address_line1: string; address_line2: string | null; city: string; state: string; pincode: string;
      };
      const weightKg = defaultWeightGrams([{ quantity: ret.quantity, weight_grams: product?.weight_grams ?? null }]) / 1000;
      const created = await createShiprocketReturnOrder({
        orderId: `${order.order_number}-RTN-${vendor.slug}`.slice(0, 50),
        orderDate: new Date(order.placed_at ?? Date.now()).toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16),
        pickup: {
          name: addr.recipient_name,
          email: customer?.email ?? "",
          phone: addr.phone,
          address: { line1: addr.address_line1, line2: addr.address_line2, city: addr.city, state: addr.state, pincode: addr.pincode },
        },
        dropoff: {
          name: vendor.business_name,
          email: vendor.support_email ?? "",
          phone: vendorPhone,
          address: { line1: wh.line1, city: wh.city, state: wh.state, pincode: wh.pincode },
        },
        items: [{ name: item.product_name, sku: (item.product_id ?? ret.order_item_id).slice(0, 8), units: ret.quantity, sellingPrice: Number(item.unit_price), taxRate: Number(item.gst_rate), hsn: item.hsn_code }],
        subTotal: Math.round(Number(item.unit_price) * ret.quantity * 100) / 100,
        weightKg,
        lengthCm: pkg.lengthCm,
        breadthCm: pkg.breadthCm,
        heightCm: pkg.heightCm,
      });
      shiprocketShipmentId = created.shipmentId;
      await admin.from("shipments").update({ shiprocket_order_id: created.shiprocketOrderId, shiprocket_shipment_id: created.shipmentId }).eq("id", shipmentRowId);
    }

    // ---- 3. courier + AWB
    const { awb, courierName } = await assignAwb(shiprocketShipmentId);
    await admin.from("shipments").update({ awb_number: awb, courier_name: courierName, tracking_url: trackingUrl(awb), status: "confirmed" }).eq("id", shipmentRowId);

    // ---- 4. ask the courier to collect from the customer (best effort, same as a forward dispatch)
    let warning: string | undefined;
    try {
      await generatePickup(shiprocketShipmentId);
    } catch (error) {
      console.error("Return pickup generation failed", error);
      warning = "Pickup booked, but the collection request didn't go through — the courier may still collect it, or arrange it from the Shiprocket panel.";
    }

    const base = appBaseUrl();
    const { data: buyer } = await admin.from("users").select("full_name").eq("id", order.customer_id).single();
    await notifyUser({
      userId: order.customer_id, category: "order_updates", type: "return_pickup_scheduled", title: "Your return pickup is scheduled",
      message: `A courier${courierName ? ` from ${courierName}` : ""} will collect ${item.product_name} for order ${order.order_number}${awb ? ` — tracking ${awb}` : ""}.`,
      linkUrl: `/orders/${order.id}`,
      email: buildReturnUpdateEmail({
        kind: "pickup_scheduled", firstName: (buyer?.full_name ?? "there").split(" ")[0], orderNumber: order.order_number, productName: item.product_name,
        courier: courierName, awb, trackingUrl: trackingUrl(awb), note: null, orderUrl: `${base}/orders/${order.id}`, preferencesUrl: `${base}/account/notifications`,
      }),
    });
    if (vendor) {
      const { data: vendorRow } = await admin.from("vendors").select("user_id").eq("id", ret.vendor_id).single();
      if (vendorRow?.user_id) {
        await notifyUser({
          userId: vendorRow.user_id, category: "vendor_updates", type: "vendor_return_pickup_scheduled", title: "A return pickup was scheduled",
          message: `${order.order_number}: ${item.product_name} is being collected from the customer and will arrive at your warehouse.`, linkUrl: "/vendor/returns", push: false,
        });
      }
    }

    return { awb, warning };
  } catch (error) {
    console.error("Return pickup booking failed", error);
    const message = error instanceof ShiprocketError ? error.message : "Something went wrong talking to the courier.";
    const { data: row } = await admin.from("shipments").select("shiprocket_shipment_id, awb_number").eq("id", shipmentRowId).single();
    if (row && !row.shiprocket_shipment_id && !row.awb_number) await admin.from("shipments").delete().eq("id", shipmentRowId);
    return { error: `${message} You can try again.` };
  }
}

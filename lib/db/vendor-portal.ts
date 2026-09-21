import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/db/server";
import { requireRole, type SessionUser } from "@/lib/auth/session";

/** The signed-in user's own vendor profile (plus its private details — RLS only returns them to the owner/admin). */
export const getMyVendor = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*, details:vendor_private(*)")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
});

export type MyVendor = NonNullable<Awaited<ReturnType<typeof getMyVendor>>>;

/**
 * Gate for every page inside the vendor portal: must be role vendor/admin AND have an approved vendor
 * profile. Someone with the role but no profile (or a pending/rejected one) is sent to the application page.
 */
export async function requireApprovedVendor(): Promise<{ user: SessionUser; vendor: MyVendor }> {
  const user = await requireRole("vendor", "admin");
  const vendor = await getMyVendor(user.id);

  if (!vendor || vendor.status !== "approved") {
    redirect("/vendor/register");
  }
  return { user, vendor };
}

export async function getVendorProducts(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, base_price, sale_price, stock_quantity, status, rejection_reason, thumbnail_url, category:categories(name), updated_at")
    .eq("vendor_id", vendorId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getVendorProduct(vendorId: string, productId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, images:product_images(id, url, thumb_url, medium_url, alt_text, sort_order, is_primary), variants:product_variants(id, name, value, price_adjustment, stock_quantity, is_active)",
    )
    .eq("id", productId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getVendorProductCounts(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("products").select("status, stock_quantity").eq("vendor_id", vendorId);
  if (error) throw error;

  const rows = data ?? [];
  const counts = { total: rows.length, pending: 0, active: 0, inactive: 0, rejected: 0, lowStock: 0 };
  for (const row of rows) {
    if (row.status === "pending" || row.status === "approved") counts.pending += 1;
    else if (row.status === "active") counts.active += 1;
    else if (row.status === "inactive") counts.inactive += 1;
    else if (row.status === "rejected") counts.rejected += 1;
    if (row.status === "active" && row.stock_quantity <= 5) counts.lowStock += 1;
  }
  return counts;
}

export async function getVendorOrderItems(vendorId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("order_items")
    .select("id, product_name, quantity, total_price, fulfilment_status, created_at, order:orders(order_number, status, placed_at)")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data ?? [];
}

export async function getActiveCategoryOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("categories").select("id, name").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
}

export interface VendorOrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  variant_label: string | null;
  personalization: unknown;
  quantity: number;
  total_price: number;
  discount_amount: number;
  fulfilment_status: string;
}

export interface VendorOrderShipment {
  id: string;
  status: string;
  awb_number: string | null;
  courier_name: string | null;
  tracking_url: string | null;
  estimated_delivery: string | null;
}

export interface VendorOrder {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  placedAt: string | null;
  address: Record<string, string | null>;
  giftMessage: string | null;
  giftWrap: boolean;
  giftWrapStyle: string | null;
  items: VendorOrderItem[];
  shipment: VendorOrderShipment | null;
  payout: number;
  weightItems: { quantity: number; weight_grams: number | null }[];
}

const VENDOR_ORDER_SELECT = `
  id, order_id, product_id, product_name, product_image, variant_label, personalization, quantity, total_price,
  discount_amount, fulfilment_status, created_at,
  order:orders ( id, order_number, status, placed_at, delivery_address, gift_message, gift_wrap_selected, gift_wrap_style ),
  financials:order_item_financials ( vendor_payout )
`;

/**
 * The vendor's own PAID orders, grouped per order, with their shipment (if any). Read with the vendor's session —
 * RLS (order_visible_to_vendors) is what hides unpaid/abandoned orders, not just this query.
 */
export async function getVendorOrders(vendorId: string) {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("order_items")
    .select(VENDOR_ORDER_SELECT)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const orderIds = Array.from(new Set((rows ?? []).map((r) => r.order_id)));
  const productIds = Array.from(new Set((rows ?? []).map((r) => r.product_id).filter((id): id is string => !!id)));

  const [{ data: shipments }, { data: products }] = await Promise.all([
    orderIds.length
      ? supabase
          .from("shipments")
          .select("id, order_id, status, awb_number, courier_name, tracking_url, estimated_delivery, created_at")
          .eq("vendor_id", vendorId)
          .eq("is_return", false)
          .neq("status", "cancelled")
          .in("order_id", orderIds)
      : Promise.resolve({ data: [] }),
    productIds.length
      ? supabase.from("products").select("id, weight_grams").in("id", productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const shipmentByOrder = new Map((shipments ?? []).map((s) => [s.order_id, s]));
  const weightByProduct = new Map((products ?? []).map((p) => [p.id, p.weight_grams]));

  const orders = new Map<string, VendorOrder>();

  for (const row of rows ?? []) {
    const order = Array.isArray(row.order) ? row.order[0] : row.order;
    if (!order) continue;
    const entry: VendorOrder = orders.get(row.order_id) ?? {
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: order.status,
      placedAt: order.placed_at,
      address: (order.delivery_address ?? {}) as Record<string, string | null>,
      giftMessage: order.gift_message,
      giftWrap: order.gift_wrap_selected,
      giftWrapStyle: order.gift_wrap_style,
      items: [],
      shipment: shipmentByOrder.get(row.order_id) ?? null,
      payout: 0,
      weightItems: [],
    };
    entry.items.push(row);
    const fin = Array.isArray(row.financials) ? row.financials[0] : row.financials;
    entry.payout += Number(fin?.vendor_payout ?? 0);
    entry.weightItems.push({ quantity: row.quantity, weight_grams: row.product_id ? (weightByProduct.get(row.product_id) ?? null) : null });
    orders.set(row.order_id, entry);
  }
  return Array.from(orders.values());
}


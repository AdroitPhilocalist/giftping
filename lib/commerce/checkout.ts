import "server-only";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { resolveCommissionRate } from "@/lib/commerce/commission";
import { lookupCoupon } from "@/lib/commerce/coupons";
import { computeUnitPrice, effectiveStock } from "@/lib/commerce/pricing";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { computeQuote, type CouponRule, type Quote, type QuoteLineInput } from "@/lib/commerce/totals";
import type { Personalization } from "@/lib/validation/cart.schema";
import type { Json } from "@/lib/db/types";

/**
 * Everything that decides what an order costs is derived HERE, from the database, at request time:
 * prices from products/variants, stock, GST rate, commission, coupon rules, delivery settings. The only
 * things taken from the client are *which* cart lines (read from the shopper's own cart under RLS), which
 * saved address, gift options and an idempotency key. No price, total, discount or vendor ever comes from
 * the request — `cart_items.unit_price_snapshot` is deliberately never read.
 */

export interface CheckoutLine extends QuoteLineInput {
  cartItemId: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  vendorName: string;
  variantIds: string[];
  variantLabels: string[];
  personalization: Personalization;
  hsnCode: string | null;
  weightGrams: number | null;
  /** Non-null when this line can't be bought right now (delisted, out of stock, option removed…). */
  issue: string | null;
}

export interface CheckoutSnapshot {
  cartId: string;
  couponCode: string | null;
  lines: CheckoutLine[];
  issues: string[];
  settings: Awaited<ReturnType<typeof getCommerceSettings>>;
  coupon: CouponRule | null;
  /** Why the stored coupon can't be used (invalid/expired/limit reached) — distinct from a scope/minimum failure, which computeQuote reports. */
  couponLookupError: string | null;
}

function asPersonalization(value: unknown): Personalization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ["recipientName", "giftMessage", "occasion"]) {
    if (typeof source[key] === "string" && source[key]) out[key] = source[key] as string;
  }
  return out;
}

export async function loadCheckoutSnapshot(userId: string): Promise<CheckoutSnapshot | null> {
  const client = await createClient(); // the shopper's own session: RLS guarantees this is THEIR cart
  const { data: cart } = await client.from("cart").select("id, coupon_code").eq("user_id", userId).maybeSingle();
  if (!cart) return null;

  const { data: rows, error } = await client
    .from("cart_items")
    .select("id, product_id, variant_ids, quantity, personalization")
    .eq("cart_id", cart.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return null;

  const catalogue = createAdminClient();
  const productIds = Array.from(new Set(rows.map((r) => r.product_id)));
  const variantIds = Array.from(new Set(rows.flatMap((r) => r.variant_ids)));

  const [{ data: products }, { data: variants }, settings] = await Promise.all([
    catalogue
      .from("products")
      .select(
        `id, name, slug, base_price, sale_price, stock_quantity, status, thumbnail_url, gst_rate, hsn_code, weight_grams,
         category_id, vendor_id, vendor:vendors ( id, business_name, status )`,
      )
      .in("id", productIds),
    variantIds.length > 0
      ? catalogue
          .from("product_variants")
          .select("id, product_id, name, value, price_adjustment, stock_quantity, is_active")
          .in("id", variantIds)
      : Promise.resolve({ data: [] as never[] }),
    getCommerceSettings(),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const variantById = new Map((variants ?? []).map((v) => [v.id, v]));

  const vendorIds = Array.from(new Set((products ?? []).map((p) => p.vendor_id)));
  const categoryIds = Array.from(new Set((products ?? []).map((p) => p.category_id).filter((id): id is string => !!id)));
  const [{ data: vendorPrivate }, { data: categories }] = await Promise.all([
    catalogue.from("vendor_private").select("vendor_id, commission_rate").in("vendor_id", vendorIds),
    categoryIds.length > 0
      ? catalogue.from("categories").select("id, commission_rate").in("id", categoryIds)
      : Promise.resolve({ data: [] as { id: string; commission_rate: number | null }[] }),
  ]);
  const vendorRate = new Map((vendorPrivate ?? []).map((v) => [v.vendor_id, v.commission_rate]));
  const categoryRate = new Map((categories ?? []).map((c) => [c.id, c.commission_rate]));

  const lines: CheckoutLine[] = rows.map((row) => {
    const product = productById.get(row.product_id);
    const chosen = row.variant_ids.map((id) => variantById.get(id));
    const variantsOk = chosen.every((v) => v && v.is_active && v.product_id === row.product_id);

    let issue: string | null = null;
    if (!product || product.status !== "active" || product.vendor?.status !== "approved" || !variantsOk) {
      issue = `${product?.name ?? "An item"} is no longer available.`;
    }

    const valid = issue === null && product && variantsOk;
    const unitPrice = valid
      ? computeUnitPrice({
          basePrice: Number(product.base_price),
          salePrice: product.sale_price === null ? null : Number(product.sale_price),
          adjustments: chosen.map((v) => Number(v!.price_adjustment)),
        })
      : 0;
    const stock = valid
      ? effectiveStock(
          product.stock_quantity,
          chosen.map((v) => v!.stock_quantity),
        )
      : 0;
    if (valid && stock < row.quantity) {
      issue = stock === 0 ? `${product.name} is out of stock.` : `Only ${stock} of ${product.name} available.`;
    }

    return {
      key: row.id,
      cartItemId: row.id,
      productId: row.product_id,
      slug: product?.slug ?? "",
      name: product?.name ?? "Unavailable product",
      imageUrl: product?.thumbnail_url ?? null,
      vendorId: product?.vendor_id ?? "",
      vendorName: product?.vendor?.business_name ?? "",
      categoryId: product?.category_id ?? null,
      unitPrice,
      quantity: row.quantity,
      gstRate: product ? Number(product.gst_rate) : 0,
      commissionRate: product
        ? resolveCommissionRate({
            vendorRate: vendorRate.get(product.vendor_id),
            categoryRate: product.category_id ? categoryRate.get(product.category_id) : null,
            platformRate: settings.platformCommissionRate,
          })
        : 0,
      hsnCode: product?.hsn_code ?? null,
      weightGrams: product?.weight_grams ?? null,
      variantIds: row.variant_ids,
      variantLabels: chosen.filter((v) => v).map((v) => `${v!.name}: ${v!.value}`),
      personalization: asPersonalization(row.personalization),
      issue,
    };
  });

  let coupon: CouponRule | null = null;
  let couponLookupError: string | null = null;
  if (cart.coupon_code) {
    const found = await lookupCoupon(cart.coupon_code, userId);
    if (found.ok) coupon = found.coupon;
    else couponLookupError = found.error;
  }

  return {
    cartId: cart.id,
    couponCode: cart.coupon_code,
    lines,
    issues: lines.flatMap((l) => (l.issue ? [l.issue] : [])),
    settings,
    coupon,
    couponLookupError,
  };
}

export function quoteFor(snapshot: CheckoutSnapshot, giftWrap: boolean): Quote {
  return computeQuote({
    lines: snapshot.lines,
    coupon: snapshot.coupon,
    giftWrap,
    settings: snapshot.settings,
  });
}

export interface DeliveryAddressSnapshot {
  label: string | null;
  recipient_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export type PlaceOrderOutcome =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

/** Builds the payload from the snapshot + quote and hands it to the atomic place_order() SQL function. */
export async function persistOrder(args: {
  userId: string;
  snapshot: CheckoutSnapshot;
  quote: Quote;
  address: DeliveryAddressSnapshot;
  giftWrap: boolean;
  giftMessage: string | null;
  idempotencyKey: string;
}): Promise<PlaceOrderOutcome> {
  const { snapshot, quote } = args;
  const applied = snapshot.coupon && !quote.couponError ? snapshot.coupon : null;
  const quoteByKey = new Map(quote.lines.map((l) => [l.key, l]));

  const items = snapshot.lines.map((line) => {
    const q = quoteByKey.get(line.key)!;
    return {
      product_id: line.productId,
      vendor_id: line.vendorId,
      variant_ids: line.variantIds,
      product_name: line.name,
      product_image: line.imageUrl,
      variant_label: line.variantLabels.length > 0 ? line.variantLabels.join(", ") : null,
      personalization: line.personalization,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      total_price: q.gross,
      discount_amount: q.discount,
      gst_rate: line.gstRate,
      gst_amount: q.gstAmount,
      hsn_code: line.hsnCode,
      commission_rate: line.commissionRate,
      commission_base: q.commissionBase,
      commission_amount: q.commissionAmount,
      vendor_payout: q.vendorPayout,
      vendor_funded_discount: q.vendorFundedDiscount,
      platform_funded_discount: q.platformFundedDiscount,
    };
  });

  const order = {
    idempotency_key: args.idempotencyKey,
    delivery_address: args.address,
    gift_message: args.giftMessage,
    gift_wrap_selected: args.giftWrap,
    gift_wrap_charge: quote.giftWrap,
    subtotal: quote.subtotal,
    discount_amount: quote.discount,
    delivery_charge: quote.delivery,
    gst_amount: quote.gstTotal,
    total_amount: quote.total,
    coupon_id: applied?.id ?? null,
    coupon_code: applied?.code ?? null,
  };

  const { data, error } = await createAdminClient().rpc("place_order", {
    p_customer_id: args.userId,
    p_order: order as unknown as Json,
    p_items: items as unknown as Json,
  });

  if (error) {
    const message = error.message ?? "";
    if (message.includes("OUT_OF_STOCK")) return { ok: false, error: "Something in your cart just sold out. Please review your cart." };
    if (message.includes("COUPON_UNAVAILABLE")) return { ok: false, error: "That coupon is no longer available. Remove it and try again." };
    console.error("place_order failed", error);
    return { ok: false, error: "We couldn't place your order. Please try again." };
  }

  const result = data as { order_id: string; order_number: string } | null;
  if (!result) return { ok: false, error: "We couldn't place your order. Please try again." };
  return { ok: true, orderId: result.order_id, orderNumber: result.order_number };
}

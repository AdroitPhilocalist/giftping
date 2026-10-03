import { normaliseEngraving, parsePersonalizationOptions } from "@/lib/personalization/engraving";
import "server-only";
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/db/server";
import { createAdminClient } from "@/lib/db/admin";
import { getServerUser } from "@/lib/auth/session";
import type { Database } from "@/lib/db/types";
import {
  clearGuestCartToken,
  issueGuestCartToken,
  readGuestCartToken,
} from "@/lib/commerce/guest-cart-cookie";
import {
  MAX_CART_LINES,
  computeUnitPrice,
  effectiveStock,
  lineTotal,
  maxPurchasable,
} from "@/lib/commerce/pricing";
import type { Personalization } from "@/lib/validation/cart.schema";

type Client = SupabaseClient<Database>;

/**
 * Cart storage model (see the Stage 1 RLS notes):
 *  - a signed-in shopper's cart is read/written with THEIR session client, so RLS is the enforcement;
 *  - a guest cart has no RLS path at all (by design) — it's reached with the service-role client, but
 *    only ever by the 256-bit random token in the shopper's httpOnly cookie, which is the sole way to
 *    resolve a cart id. There is no "list carts" or "look up by id from the client" surface.
 */
interface CartContext {
  client: Client;
  cartId: string;
  owner: "user" | "guest";
}

// ---------------------------------------------------------------------------
// Context resolution
// ---------------------------------------------------------------------------

/**
 * Resolves (and, when `create` is set, creates) the current shopper's cart. `create: false` never
 * writes anything and never touches cookies, so it is safe to call while rendering.
 * With `create: true` this must run inside a Server Action / Route Handler.
 */
async function resolveCart(create: boolean): Promise<CartContext | null> {
  const user = await getServerUser();

  if (user) {
    if (create) await mergeGuestCartIntoUser(user.id); // a stale guest cookie must not strand items
    const client = await createClient();
    const { data: existing } = await client.from("cart").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) return { client, cartId: existing.id, owner: "user" };
    if (!create) return null;

    const { data: created, error } = await client.from("cart").insert({ user_id: user.id }).select("id").single();
    if (created) return { client, cartId: created.id, owner: "user" };
    // Lost a race with a concurrent request creating the same cart (unique index on user_id).
    const { data: raced } = await client.from("cart").select("id").eq("user_id", user.id).maybeSingle();
    if (raced) return { client, cartId: raced.id, owner: "user" };
    throw error ?? new Error("Could not create cart");
  }

  const admin = createAdminClient();
  let token = await readGuestCartToken();
  if (!token) {
    if (!create) return null;
    token = await issueGuestCartToken();
  }

  const { data: existing } = await admin.from("cart").select("id").eq("guest_token", token).maybeSingle();
  if (existing) return { client: admin, cartId: existing.id, owner: "guest" };
  if (!create) return null;

  const { data: created, error } = await admin.from("cart").insert({ guest_token: token }).select("id").single();
  if (!created) throw error ?? new Error("Could not create cart");
  return { client: admin, cartId: created.id, owner: "guest" };
}

/**
 * Moves the guest cookie's cart into the account cart (atomic SQL function — see the Stage 5
 * migration) and clears the cookie. Must run where cookies are writable. Never throws: a merge
 * failure must not block a sign-in, and the guest cart simply stays put for the next attempt.
 */
export async function mergeGuestCartIntoUser(userId: string): Promise<void> {
  const token = await readGuestCartToken();
  if (!token) return;
  try {
    const { error } = await createAdminClient().rpc("merge_guest_cart", {
      p_guest_token: token,
      p_user_id: userId,
    });
    if (error) throw error;
    await clearGuestCartToken();
  } catch (error) {
    console.error("Guest cart merge failed", error);
  }
}

/** True when a signed-in shopper still has a guest cookie the server couldn't merge during render. */
export async function hasUnmergedGuestCart(): Promise<boolean> {
  const [user, token] = await Promise.all([getServerUser(), readGuestCartToken()]);
  return Boolean(user && token);
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const CART_ITEM_SELECT = `
  id, quantity, personalization, unit_price_snapshot, variant_ids, created_at,
  product:products (
    id, name, slug, base_price, sale_price, thumbnail_url, stock_quantity, status,
    vendor:vendors ( id, business_name, slug, status )
  )
`;

export type CartLineStatus =
  | "ok"
  | "unavailable" // delisted / vendor suspended / chosen option removed
  | "out_of_stock"
  | "limited"; // quantity in cart exceeds current stock

export interface CartLine {
  id: string;
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  quantity: number;
  unitPrice: number;
  /** What the price was when the item was added (display only — used to flag a price change). */
  priceWhenAdded: number;
  priceChanged: boolean;
  lineTotal: number;
  variantLabels: string[];
  personalization: Personalization;
  stock: number;
  maxQuantity: number;
  status: CartLineStatus;
}

export interface CartVendorGroup {
  vendorId: string;
  vendorName: string;
  vendorSlug: string;
  lines: CartLine[];
  subtotal: number;
}

export interface CartView {
  groups: CartVendorGroup[];
  /** Units across every line (what the navbar badge shows). */
  itemCount: number;
  /** Total of lines that can actually be bought right now. */
  subtotal: number;
  hasIssues: boolean;
}

const EMPTY_CART: CartView = { groups: [], itemCount: 0, subtotal: 0, hasIssues: false };

interface VariantRow {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

function asPersonalization(value: unknown): Personalization {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of ["engraving", "recipientName", "giftMessage", "occasion"]) {
    if (typeof source[key] === "string" && source[key]) out[key] = source[key] as string;
  }
  return out;
}

export const getCartView = cache(async function getCartView(): Promise<CartView> {
  const ctx = await resolveCart(false);
  if (!ctx) return EMPTY_CART;

  const { data: rows, error } = await ctx.client
    .from("cart_items")
    .select(CART_ITEM_SELECT)
    .eq("cart_id", ctx.cartId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return EMPTY_CART;

  const variantIds = Array.from(new Set(rows.flatMap((r) => r.variant_ids)));
  const variantsById = new Map<string, VariantRow>();
  if (variantIds.length > 0) {
    const { data: variants, error: variantError } = await ctx.client
      .from("product_variants")
      .select("id, product_id, name, value, price_adjustment, stock_quantity, is_active")
      .in("id", variantIds);
    if (variantError) throw variantError;
    for (const v of variants ?? []) variantsById.set(v.id, v);
  }

  const groups = new Map<string, CartVendorGroup>();
  let itemCount = 0;
  let subtotal = 0;
  let hasIssues = false;

  for (const row of rows) {
    const product = row.product;
    const vendor = product?.vendor;
    // A product hidden by RLS (delisted) comes back null for a signed-in shopper; the service-role guest
    // path sees everything, so status is checked explicitly for both.
    const listed = Boolean(product && vendor && product.status === "active" && vendor.status === "approved");

    const chosen = row.variant_ids.map((id) => variantsById.get(id));
    const variantsOk = chosen.every((v) => v && v.is_active && v.product_id === product?.id);

    const unitPrice =
      product && variantsOk
        ? computeUnitPrice({
            basePrice: Number(product.base_price),
            salePrice: product.sale_price === null ? null : Number(product.sale_price),
            adjustments: chosen.map((v) => Number(v!.price_adjustment)),
          })
        : Number(row.unit_price_snapshot);

    const stock =
      product && variantsOk
        ? effectiveStock(
            product.stock_quantity,
            chosen.map((v) => v!.stock_quantity),
          )
        : 0;

    let status: CartLineStatus = "ok";
    if (!listed || !variantsOk) status = "unavailable";
    else if (stock === 0) status = "out_of_stock";
    else if (row.quantity > maxPurchasable(stock)) status = "limited";

    const total = lineTotal(unitPrice, row.quantity);
    itemCount += row.quantity;
    if (status === "ok") subtotal += total;
    else hasIssues = true;

    const line: CartLine = {
      id: row.id,
      productId: product?.id ?? "",
      slug: product?.slug ?? "",
      name: product?.name ?? "Unavailable product",
      imageUrl: product?.thumbnail_url ?? null,
      vendorId: vendor?.id ?? "unknown",
      vendorName: vendor?.business_name ?? "Unavailable vendor",
      vendorSlug: vendor?.slug ?? "",
      quantity: row.quantity,
      unitPrice,
      priceWhenAdded: Number(row.unit_price_snapshot),
      priceChanged: status === "ok" && Math.abs(unitPrice - Number(row.unit_price_snapshot)) >= 0.01,
      lineTotal: total,
      variantLabels: chosen.filter((v): v is VariantRow => Boolean(v)).map((v) => `${v.name}: ${v.value}`),
      personalization: asPersonalization(row.personalization),
      stock,
      maxQuantity: maxPurchasable(stock),
      status,
    };

    const group = groups.get(line.vendorId) ?? {
      vendorId: line.vendorId,
      vendorName: line.vendorName,
      vendorSlug: line.vendorSlug,
      lines: [],
      subtotal: 0,
    };
    group.lines.push(line);
    if (status === "ok") group.subtotal += total;
    groups.set(line.vendorId, group);
  }

  return {
    groups: Array.from(groups.values()),
    itemCount,
    subtotal: Math.round(subtotal * 100) / 100,
    hasIssues,
  };
});

/** Cheap unit count for the navbar badge — one small query, no joins. */
export const getCartCount = cache(async function getCartCount(): Promise<number> {
  const ctx = await resolveCart(false);
  if (!ctx) return 0;
  const { data } = await ctx.client.from("cart_items").select("quantity").eq("cart_id", ctx.cartId);
  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
});

// ---------------------------------------------------------------------------
// Writing (call only from Server Actions)
// ---------------------------------------------------------------------------

export interface CartMutationResult {
  error?: string;
  message?: string;
  count?: number;
}

export interface AddItemInput {
  productId: string;
  variantIds: string[]; // sorted, de-duplicated (see addToCartSchema)
  quantity: number;
  personalization: Personalization;
}

async function countUnits(ctx: CartContext): Promise<number> {
  const { data } = await ctx.client.from("cart_items").select("quantity").eq("cart_id", ctx.cartId);
  return (data ?? []).reduce((sum, row) => sum + row.quantity, 0);
}

export async function addItemToCart(input: AddItemInput): Promise<CartMutationResult> {
  // The catalogue is read with the service role so a guest (who has no RLS path to variants of a live
  // product beyond what's public anyway) and a signed-in shopper are validated by identical code.
  // Everything is checked explicitly; nothing here trusts the client's price or vendor.
  const catalogue = createAdminClient();
  const { data: product } = await catalogue
    .from("products")
    .select(
      `id, base_price, sale_price, stock_quantity, status, personalization_options,
       vendor:vendors ( status ),
       variants:product_variants ( id, name, price_adjustment, stock_quantity, is_active )`,
    )
    .eq("id", input.productId)
    .maybeSingle();

  if (!product || product.status !== "active" || product.vendor?.status !== "approved") {
    return { error: "This product isn't available right now." };
  }

  // Live engraving: the product's OWN setup decides whether text is allowed, required, and how long it may be. A product with no setup never keeps engraving
  // text a client sent anyway, and the text is re-checked here whatever the browser already said.
  const engravingConfig = parsePersonalizationOptions(product.personalization_options);
  const personalization = { ...input.personalization };
  if (engravingConfig) {
    const checked = normaliseEngraving(personalization.engraving, engravingConfig);
    if (!checked.ok) return { error: checked.error };
    if (checked.text) personalization.engraving = checked.text;
    else delete personalization.engraving;
  } else {
    delete personalization.engraving;
  }

  const activeVariants = product.variants.filter((v) => v.is_active);
  const chosen = input.variantIds.map((id) => activeVariants.find((v) => v.id === id));
  if (chosen.some((v) => !v)) return { error: "That option is no longer available." };
  const picked = chosen as typeof activeVariants;

  const groupNames = new Set(activeVariants.map((v) => v.name));
  const pickedNames = new Set(picked.map((v) => v.name));
  if (pickedNames.size !== picked.length) return { error: "Choose one option per group." };
  if (pickedNames.size !== groupNames.size) return { error: "Please choose all the options first." };

  const stock = effectiveStock(
    product.stock_quantity,
    picked.map((v) => v.stock_quantity),
  );
  const limit = maxPurchasable(stock);
  if (limit === 0) return { error: "Sorry, that's out of stock." };

  const ctx = await resolveCart(true);
  if (!ctx) return { error: "Couldn't open your cart. Please try again." };

  const { data: sameProduct, error: lookupError } = await ctx.client
    .from("cart_items")
    .select("id, quantity, variant_ids, personalization")
    .eq("cart_id", ctx.cartId)
    .eq("product_id", input.productId);
  if (lookupError) return { error: "Couldn't update your cart. Please try again." };

  const personalizationKey = JSON.stringify(personalization, Object.keys(personalization).sort());
  const existing = (sameProduct ?? []).find(
    (row) =>
      row.variant_ids.join(",") === input.variantIds.join(",") &&
      JSON.stringify(asPersonalization(row.personalization), Object.keys(asPersonalization(row.personalization)).sort()) ===
        personalizationKey,
  );

  const unitPrice = computeUnitPrice({
    basePrice: Number(product.base_price),
    salePrice: product.sale_price === null ? null : Number(product.sale_price),
    adjustments: picked.map((v) => Number(v.price_adjustment)),
  });

  let message = "Added to your cart.";
  if (existing) {
    if (existing.quantity >= limit) {
      return { error: `You already have the maximum available (${limit}) in your cart.` };
    }
    const wanted = existing.quantity + input.quantity;
    const next = Math.min(wanted, limit);
    if (next < wanted) message = `Only ${limit} available — your cart now has ${limit}.`;
    const { error } = await ctx.client
      .from("cart_items")
      .update({ quantity: next, unit_price_snapshot: unitPrice })
      .eq("id", existing.id)
      .eq("cart_id", ctx.cartId);
    if (error) return { error: "Couldn't update your cart. Please try again." };
  } else {
    const { count } = await ctx.client
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("cart_id", ctx.cartId);
    if ((count ?? 0) >= MAX_CART_LINES) {
      return { error: `Your cart is full (${MAX_CART_LINES} different items). Remove something first.` };
    }

    const next = Math.min(input.quantity, limit);
    if (next < input.quantity) message = `Only ${limit} available — added ${limit}.`;
    const { error } = await ctx.client.from("cart_items").insert({
      cart_id: ctx.cartId,
      product_id: input.productId,
      variant_ids: input.variantIds,
      // vendor_id is overwritten by the cart_items_enforce_catalog trigger from the product itself.
      vendor_id: "00000000-0000-0000-0000-000000000000",
      quantity: next,
      personalization,
      unit_price_snapshot: unitPrice,
    });
    if (error) return { error: "Couldn't add that to your cart. Please try again." };
  }

  return { message, count: await countUnits(ctx) };
}

export async function setLineQuantity(lineId: string, quantity: number): Promise<CartMutationResult> {
  const ctx = await resolveCart(false);
  if (!ctx) return { error: "Your cart is empty." };

  const view = await getCartView();
  const line = view.groups.flatMap((g) => g.lines).find((l) => l.id === lineId);
  if (!line) return { error: "That item is no longer in your cart." };

  // Lowering is always allowed (even for a delisted item); raising needs live stock.
  if (quantity > line.quantity && quantity > line.maxQuantity) {
    return {
      error: line.maxQuantity === 0 ? "That item isn't available." : `Only ${line.maxQuantity} available.`,
    };
  }

  const { error } = await ctx.client
    .from("cart_items")
    .update({ quantity })
    .eq("id", lineId)
    .eq("cart_id", ctx.cartId);
  if (error) return { error: "Couldn't update the quantity. Please try again." };
  return { count: await countUnits(ctx) };
}

export async function removeLine(lineId: string): Promise<CartMutationResult> {
  const ctx = await resolveCart(false);
  if (!ctx) return { count: 0 };
  const { error } = await ctx.client.from("cart_items").delete().eq("id", lineId).eq("cart_id", ctx.cartId);
  if (error) return { error: "Couldn't remove that item. Please try again." };
  return { count: await countUnits(ctx) };
}

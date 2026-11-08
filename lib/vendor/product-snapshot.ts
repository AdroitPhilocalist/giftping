import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { createAdminClient } from "@/lib/db/admin";
import { parsePersonalizationOptions } from "@/lib/personalization/engraving";
import {
  PRODUCT_VENDOR_CHANGE_ACTION,
  PRODUCT_SNAPSHOT_VERSION,
  type ProductAttributeSnapshot,
  type ProductSnapshot,
  type ProductVariantSnapshot,
} from "@/lib/catalog/product-review";

type Client = SupabaseClient<Database>;

type Relation<T> = T | T[] | null;

interface SnapshotImageRow {
  id: string;
  url: string;
  thumb_url: string | null;
  alt_text: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface SnapshotVariantRow {
  id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

interface SnapshotAttributeValueRow {
  attribute_id: string;
  value: string;
  attribute: Relation<{ key: string; label: string }>;
}

interface SnapshotRow {
  id: string;
  name: string;
  category_id: string | null;
  product_type_id: string | null;
  short_description: string | null;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  sku: string | null;
  stock_quantity: number;
  weight_grams: number | null;
  gst_rate: number;
  hsn_code: string | null;
  tags: string[];
  occasion_tags: string[];
  recipient_tags: string[];
  personalization_options: unknown;
  category: Relation<{ name: string }>;
  product_type: Relation<{ name: string }>;
  images: SnapshotImageRow[] | null;
  variants: SnapshotVariantRow[] | null;
  attributeValues: SnapshotAttributeValueRow[] | null;
}

const PRODUCT_SNAPSHOT_SELECT = `
  id,
  name,
  category_id,
  product_type_id,
  short_description,
  description,
  base_price,
  sale_price,
  sku,
  stock_quantity,
  weight_grams,
  gst_rate,
  hsn_code,
  tags,
  occasion_tags,
  recipient_tags,
  personalization_options,
  category:categories ( name ),
  product_type:product_types ( name ),
  images:product_images ( id, url, thumb_url, alt_text, is_primary, sort_order ),
  variants:product_variants ( id, name, value, price_adjustment, stock_quantity, is_active ),
  attributeValues:product_attribute_values ( attribute_id, value, attribute:product_attributes ( key, label ) )
`;

function one<T>(value: Relation<T> | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function cleanStrings(values: readonly string[] | null | undefined): string[] {
  return Array.from(new Set((values ?? []).map((value) => value.trim()).filter(Boolean)));
}

function toSnapshot(row: SnapshotRow): ProductSnapshot {
  const category = one(row.category);
  const productType = one(row.product_type);

  const attributes = new Map<string, ProductAttributeSnapshot>();
  for (const value of row.attributeValues ?? []) {
    const clean = value.value.trim();
    if (!clean) continue;
    const definition = one(value.attribute);
    const existing = attributes.get(value.attribute_id);
    if (existing) {
      if (!existing.values.includes(clean)) existing.values.push(clean);
    } else {
      attributes.set(value.attribute_id, {
        id: value.attribute_id,
        key: definition?.key ?? value.attribute_id,
        label: definition?.label ?? "Attribute",
        values: [clean],
      });
    }
  }

  const variants: ProductVariantSnapshot[] = (row.variants ?? [])
    .filter((variant) => variant.is_active)
    .map((variant) => ({
      id: variant.id,
      name: variant.name,
      value: variant.value,
      priceAdjustment: Number(variant.price_adjustment),
      stockQuantity: variant.stock_quantity,
    }))
    .sort((a, b) => a.name.localeCompare(b.name) || a.value.localeCompare(b.value) || a.id.localeCompare(b.id));

  return {
    version: PRODUCT_SNAPSHOT_VERSION,
    name: row.name,
    categoryId: row.category_id,
    categoryName: category?.name ?? "",
    productTypeId: row.product_type_id,
    productTypeName: productType?.name ?? "",
    shortDescription: row.short_description ?? "",
    description: row.description ?? "",
    basePrice: Number(row.base_price),
    salePrice: row.sale_price === null ? null : Number(row.sale_price),
    sku: row.sku ?? "",
    stockQuantity: row.stock_quantity,
    weightGrams: row.weight_grams,
    gstRate: Number(row.gst_rate),
    hsnCode: row.hsn_code ?? "",
    tags: cleanStrings(row.tags),
    occasionTags: cleanStrings(row.occasion_tags),
    recipientTags: cleanStrings(row.recipient_tags),
    engraving: parsePersonalizationOptions(row.personalization_options),
    variants,
    attributes: [...attributes.values()]
      .map((attribute) => ({ ...attribute, values: attribute.values.sort((a, b) => a.localeCompare(b)) }))
      .sort((a, b) => a.label.localeCompare(b.label) || a.key.localeCompare(b.key)),
    images: (row.images ?? [])
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order || a.id.localeCompare(b.id))
      .map((image) => ({
        id: image.id,
        url: image.url,
        thumbUrl: image.thumb_url,
        altText: image.alt_text,
        isPrimary: image.is_primary,
      })),
  };
}

/**
 * Reads the full reviewable state of one or more products in one round-trip. Callers using a vendor session
 * get RLS-scoped rows (and can pass vendorId as a belt-and-braces ownership check); the admin queue can call it
 * with the admin session for the current pending listings.
 */
export async function captureProductSnapshots(
  supabase: Client,
  productIds: string[],
  vendorId?: string,
): Promise<Map<string, ProductSnapshot>> {
  if (productIds.length === 0) return new Map();

  const query = supabase.from("products").select(PRODUCT_SNAPSHOT_SELECT).in("id", productIds);

  try {
    const { data, error } = vendorId ? await query.eq("vendor_id", vendorId) : await query;

    if (error) {
      console.error("[product-snapshot] couldn't read products", error);
      return new Map();
    }

    return new Map(((data ?? []) as unknown as SnapshotRow[]).map((row) => [row.id, toSnapshot(row)]));
  } catch (error) {
    console.error("[product-snapshot] couldn't read products", error);
    return new Map();
  }
}

export async function captureProductSnapshot(
  supabase: Client,
  productId: string,
  vendorId?: string,
): Promise<ProductSnapshot | null> {
  const snapshots = await captureProductSnapshots(supabase, [productId], vendorId);
  return snapshots.get(productId) ?? null;
}

/**
 * Writes the before/after pair to the existing admin-only audit trail. The insert uses the service role because
 * audit_logs deliberately has no client INSERT policy; every caller has already authenticated the vendor and
 * limited the product to their own catalogue.
 */
export async function recordProductChange(args: {
  actorId: string;
  productId: string;
  before: ProductSnapshot | null;
  after: ProductSnapshot;
}): Promise<void> {
  try {
    const { error } = await createAdminClient().from("audit_logs").insert({
      actor_id: args.actorId,
      action: PRODUCT_VENDOR_CHANGE_ACTION,
      entity_type: "product",
      entity_id: args.productId,
      before_data: args.before as never,
      after_data: args.after as never,
    });

    if (error) console.error("[product-review] couldn't record the vendor change", error);
  } catch (error) {
    // The product itself is already saved; a failed audit write must never turn that into a vendor-facing error.
    console.error("[product-review] couldn't record the vendor change", error);
  }
}

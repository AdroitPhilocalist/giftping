import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/db/admin";
import { uniqueSlug } from "@/lib/utils/slug";
import { parseProductCsv, type CategoryRef, type ImportProduct, type ParsedImport, type RowIssue } from "@/lib/vendor/product-csv";

/**
 * Bulk product upload, server half. Both steps re-read and re-validate the CSV text themselves — nothing the browser "previewed" is trusted. The commit
 * is all-or-nothing (one SQL transaction) and refuses a file this boutique has already imported. Products are created as hidden drafts.
 */
export interface ImportPreview {
  ok: boolean;
  rowCount: number;
  validCount: number;
  errors: RowIssue[];
  warnings: RowIssue[];
  /** total number of errors/warnings before the lists were trimmed for display */
  errorTotal: number;
  warningTotal: number;
  sample: { row: number; name: string; category: string; price: number; salePrice: number | null; stock: number; variants: number }[];
  alreadyImported: boolean;
}

const SHOWN = 100;

export async function importCategories(): Promise<CategoryRef[]> {
  const { data } = await createAdminClient().from("categories").select("id, name, slug").eq("is_active", true).order("sort_order");
  return data ?? [];
}

/** Same file => same hash, however the line endings were saved. */
export function fileHash(csv: string): string {
  const normalised = (csv.charCodeAt(0) === 0xfeff ? csv.slice(1) : csv).replace(/\r\n?/g, "\n").trim();
  return createHash("sha256").update(normalised).digest("hex");
}

async function checkAgainstDatabase(vendorId: string, parsed: ParsedImport, csv: string): Promise<{ errors: RowIssue[]; alreadyImported: boolean }> {
  const admin = createAdminClient();
  const errors: RowIssue[] = [];

  const skus = parsed.products.map((p) => p.sku).filter((s): s is string => !!s);
  if (skus.length > 0) {
    const { data } = await admin.from("products").select("sku").in("sku", skus);
    const taken = new Set((data ?? []).map((r) => r.sku));
    for (const p of parsed.products) if (p.sku && taken.has(p.sku)) errors.push({ row: p.row, column: "sku", message: `SKU "${p.sku}" is already used by a product — choose a different one.` });
  }
  const { data: prior } = await admin.from("product_imports").select("id").eq("vendor_id", vendorId).eq("file_hash", fileHash(csv)).maybeSingle();
  return { errors, alreadyImported: Boolean(prior) };
}

export async function previewProductImport(vendorId: string, csv: string): Promise<ImportPreview> {
  const categories = await importCategories();
  const parsed = parseProductCsv(csv, categories);
  const db = parsed.errors.length === 0 ? await checkAgainstDatabase(vendorId, parsed, csv) : { errors: [], alreadyImported: false };
  const errors = [...parsed.errors, ...db.errors].sort((a, b) => (a.row ?? 0) - (b.row ?? 0));
  const nameOf = new Map(categories.map((c) => [c.id, c.name]));
  return {
    ok: errors.length === 0 && !db.alreadyImported && parsed.products.length > 0,
    rowCount: parsed.rowCount,
    validCount: errors.length === 0 ? parsed.products.length : parsed.products.length - db.errors.length,
    errors: errors.slice(0, SHOWN),
    warnings: parsed.warnings.slice(0, SHOWN),
    errorTotal: errors.length,
    warningTotal: parsed.warnings.length,
    sample: parsed.products.slice(0, 5).map((p) => ({ row: p.row, name: p.name, category: nameOf.get(p.categoryId) ?? "", price: p.basePrice, salePrice: p.salePrice, stock: p.stockQuantity, variants: p.variants.length })),
    alreadyImported: db.alreadyImported,
  };
}

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

export async function commitProductImport(vendorId: string, csv: string, actorId: string): Promise<ImportResult> {
  const categories = await importCategories();
  const parsed = parseProductCsv(csv, categories);
  if (parsed.errors.length > 0) return { ok: false, error: "The file still has problems — check it again and fix the rows listed." };
  const db = await checkAgainstDatabase(vendorId, parsed, csv);
  if (db.alreadyImported) return { ok: false, error: "You've already imported this exact file. Change it (or add new rows) to import again." };
  if (db.errors.length > 0) return { ok: false, error: db.errors[0].message };

  const rows = parsed.products.map((p: ImportProduct) => ({
    name: p.name,
    slug: uniqueSlug(p.name),
    category_id: p.categoryId,
    short_description: p.shortDescription,
    description: p.description,
    base_price: p.basePrice,
    sale_price: p.salePrice,
    sku: p.sku,
    stock_quantity: p.stockQuantity,
    weight_grams: p.weightGrams,
    gst_rate: p.gstRate,
    hsn_code: p.hsnCode,
    tags: p.tags,
    occasion_tags: p.occasionTags,
    recipient_tags: p.recipientTags,
    variants: p.variants.map((v) => ({ name: v.name, value: v.value, price_adjustment: v.priceAdjustment, stock_quantity: v.stockQuantity })),
  }));

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("import_vendor_products", { p_vendor_id: vendorId, p_file_hash: fileHash(csv), p_products: rows as never });
  if (error) {
    const clash = /SKU_TAKEN:(.+)/.exec(error.message);
    if (clash) return { ok: false, error: `SKU "${clash[1]}" was taken while importing, so nothing was added. Check the file again.` };
    console.error("import_vendor_products failed", error);
    return { ok: false, error: "Something went wrong, so nothing was added. Please try again." };
  }
  const r = data as { result: string; count?: number; limit?: number };
  if (r.result === "imported") {
    await admin.from("audit_logs").insert({ actor_id: actorId, action: "vendor.products_imported", entity_type: "vendor", entity_id: vendorId, before_data: null, after_data: { count: r.count } as never });
    return { ok: true, count: r.count ?? rows.length };
  }
  if (r.result === "already_imported") return { ok: false, error: "You've already imported this exact file. Change it (or add new rows) to import again." };
  if (r.result === "product_limit") return { ok: false, error: `That would take you over the limit of ${r.limit} products. Contact GiftPing if you need more.` };
  if (r.result === "vendor_not_approved") return { ok: false, error: "Your boutique isn't active." };
  return { ok: false, error: "That file couldn't be imported." };
}

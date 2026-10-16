"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { productTypeSchema, productAttributeSchema, type ProductTypeInput, type ProductAttributeInput, type ProductAttributeData } from "@/lib/validation/product-type.schema";

// Runs with the ADMIN's own session: product_types_write_admin_only/product_attributes_write_admin_only
// (is_admin()) is the enforcement — this adds the role gate and friendlier messages. Same shape as
// lib/admin/category-actions.ts.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}

const idSchema = z.string().uuid();
type Supa = Awaited<ReturnType<typeof createClient>>;

function refresh() {
  revalidatePath("/admin/product-types");
  revalidatePath("/shop");
  revalidatePath("/", "layout"); // the header's product-type mega-menu
}

/**
 * A product type and its attribute rows save together, in one call — same reasoning as ProductForm.tsx
 * saving a product and its variants together: attributes are edited inline as part of the same form, so
 * there's no real moment where they're a separate save. The attribute rows themselves are diffed against
 * what's already there (see syncAttributes), not blindly replaced.
 */
export async function saveProductTypeAction(raw: ProductTypeInput, attributes: ProductAttributeInput[], id?: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  const parsed = productTypeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const t = parsed.data;

  const parsedAttrs: ProductAttributeData[] = [];
  for (const a of attributes) {
    const p = productAttributeSchema.safeParse(a);
    if (!p.success) return { error: p.error.issues[0]?.message ?? "Check the attribute details." };
    parsedAttrs.push(p.data);
  }
  // Two attributes on the same type sharing a key would collide at the DB's unique(product_type_id, key) —
  // catch it here with a clear message instead of a raw constraint error.
  const keys = parsedAttrs.map((a) => a.key);
  if (new Set(keys).size !== keys.length) return { error: "Two attributes have the same key — give each one a different label." };

  const supabase = await createClient();
  if (id && !idSchema.safeParse(id).success) return { error: "Invalid product type." };

  if (id && t.parentId) {
    if (t.parentId === id) return { error: "A category can't be its own parent." };
    const cycleError = await detectCycle(supabase, id, t.parentId);
    if (cycleError) return { error: cycleError };
  }

  const { count } = await supabase.from("product_types").select("id", { count: "exact", head: true }).eq("slug", t.slug).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  if ((count ?? 0) > 0) return { error: `The slug "${t.slug}" is already used by another product type.` };

  const row = {
    name: t.name,
    slug: t.slug,
    description: t.description,
    icon_url: t.iconUrl,
    meta_title: t.metaTitle,
    meta_description: t.metaDescription,
    is_active: t.isActive,
    parent_id: t.parentId,
  };

  let typeId = id;
  if (id) {
    const { error } = await supabase.from("product_types").update(row).eq("id", id);
    if (error) return { error: "Couldn't save the product type." };
  } else {
    const { data: last } = await supabase.from("product_types").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { data: inserted, error } = await supabase.from("product_types").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 }).select("id").single();
    if (error || !inserted) return { error: "Couldn't create the product type." };
    typeId = inserted.id;
  }

  const attrError = await syncAttributes(supabase, typeId!, parsedAttrs);
  if (attrError) return { error: attrError };

  refresh();
  return {};
}

async function fetchParentId(supabase: Supa, id: string): Promise<string | null> {
  const { data } = await supabase.from("product_types").select("parent_id").eq("id", id).maybeSingle();
  return data?.parent_id ?? null;
}

/** Walks up from `startParentId` following parent_id; returns an error message if it ever reaches `movingId` (a cycle). */
async function detectCycle(supabase: Supa, movingId: string, startParentId: string): Promise<string | null> {
  let cursor: string | null = startParentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === movingId) return "Can't move a category under its own subcategory.";
    if (seen.has(cursor)) break; // already-corrupt data defensively stops the loop rather than spinning forever
    seen.add(cursor);
    cursor = await fetchParentId(supabase, cursor);
  }
  return null;
}

/** Diffs the submitted attribute rows against what's in the DB for this type — update existing (by id, or by a
 * matching key if a "new" row is really reactivating one that was earlier removed), insert new, deactivate
 * (never hard-delete) anything dropped. A hard delete would cascade away any vendor's existing
 * product_attribute_values just because an admin edited the type — same lesson ProductForm.tsx's own
 * syncVariants already learned for order_items. */
async function syncAttributes(supabase: Supa, productTypeId: string, attributes: ProductAttributeData[]): Promise<string | null> {
  const { data: existing } = await supabase.from("product_attributes").select("id, key").eq("product_type_id", productTypeId);
  const existingByKey = new Map((existing ?? []).map((a) => [a.key, a.id]));
  const keepIds = new Set(attributes.map((a) => a.id).filter(Boolean));
  const removed = (existing ?? []).filter((a) => !keepIds.has(a.id)).map((a) => a.id);
  if (removed.length > 0) {
    await supabase.from("product_attributes").update({ is_active: false }).in("id", removed);
  }

  for (const attr of attributes) {
    const row = { key: attr.key, label: attr.label, input_type: attr.inputType, options: attr.options, is_active: true };
    const targetId = attr.id ?? existingByKey.get(attr.key);
    const { error } = targetId
      ? await supabase.from("product_attributes").update(row).eq("id", targetId).eq("product_type_id", productTypeId)
      : await supabase.from("product_attributes").insert({ ...row, product_type_id: productTypeId });
    if (error) return "Product type saved, but an attribute couldn't be saved.";
  }
  return null;
}

export async function setProductTypeActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid product type." };
  const { error } = await (await createClient()).from("product_types").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn't update the product type." };
  refresh();
  return {};
}

/** Moves a product type one place earlier or later AMONG ITS OWN SIBLINGS (same parent_id) — the one real
 * change from moveCategoryAction's flat-list version, since this list is a tree. Note: a top-level type's
 * parent_id is NULL, and PostgREST's .eq() never matches NULL (standard SQL semantics) — .is() is required
 * for that case specifically. */
export async function moveProductTypeAction(id: string, direction: "up" | "down"): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid product type." };
  const supabase = await createClient();

  const { data: self } = await supabase.from("product_types").select("parent_id").eq("id", id).maybeSingle();
  if (!self) return { error: "Product type not found." };

  const siblingsQuery = supabase.from("product_types").select("id, sort_order");
  const { data } = await (self.parent_id ? siblingsQuery.eq("parent_id", self.parent_id) : siblingsQuery.is("parent_id", null)).order("sort_order").order("created_at");
  const rows = data ?? [];
  const from = rows.findIndex((r) => r.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return {};

  const writes: PromiseLike<{ error: unknown }>[] = [];
  if (rows[from].sort_order !== rows[to].sort_order) {
    writes.push(supabase.from("product_types").update({ sort_order: rows[to].sort_order }).eq("id", rows[from].id));
    writes.push(supabase.from("product_types").update({ sort_order: rows[from].sort_order }).eq("id", rows[to].id));
  } else {
    const ids = rows.map((r) => r.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    ids.forEach((typeId, index) => writes.push(supabase.from("product_types").update({ sort_order: (index + 1) * 10 }).eq("id", typeId)));
  }
  const results = await Promise.all(writes);
  if (results.some((r) => r.error)) return { error: "Couldn't reorder the product types." };
  refresh();
  return {};
}

export async function deleteProductTypeAction(id: string): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid product type." };
  const supabase = await createClient();

  const { count: childCount } = await supabase.from("product_types").select("id", { count: "exact", head: true }).eq("parent_id", id);
  if ((childCount ?? 0) > 0) return { error: "This category has subcategories — delete or move those first." };

  const { error } = await supabase.from("product_types").delete().eq("id", id);
  if (error) return { error: "Couldn't delete the product type." };
  refresh();
  return {};
}

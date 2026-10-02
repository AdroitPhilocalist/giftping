"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { categorySchema, type CategoryInput } from "@/lib/validation/category.schema";

// Runs with the ADMIN's own session: categories_write_admin_only (is_admin()) is the enforcement — this
// adds the role gate and friendlier messages. Same shape as lib/admin/banner-actions.ts.
async function admin() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}

const idSchema = z.string().uuid();

function refresh() {
  revalidatePath("/admin/categories");
  revalidatePath("/categories");
  revalidatePath("/", "layout"); // the header's Occasions mega-menu and the homepage both read categories
}

export async function saveCategoryAction(raw: CategoryInput, id?: string): Promise<{ error?: string }> {
  const user = await admin();
  if (!user) return { error: "Admin access required." };
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const c = parsed.data;

  const supabase = await createClient();
  if (id && !idSchema.safeParse(id).success) return { error: "Invalid category." };

  // A slug is a real URL segment people may already be linking to — enforce uniqueness here with a clear
  // message rather than letting it surface as a raw DB constraint violation.
  const { count } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("slug", c.slug).neq("id", id ?? "00000000-0000-0000-0000-000000000000");
  if ((count ?? 0) > 0) return { error: `The slug "${c.slug}" is already used by another category.` };

  const row = {
    name: c.name,
    slug: c.slug,
    description: c.description,
    theme_color: c.themeColor,
    meta_title: c.metaTitle,
    meta_description: c.metaDescription,
    is_active: c.isActive,
    is_featured: c.isFeatured,
  };

  if (id) {
    const { error } = await supabase.from("categories").update(row).eq("id", id);
    if (error) return { error: "Couldn't save the category." };
  } else {
    // new categories go to the end of the line, same spacing convention as banners
    const { data: last } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    const { error } = await supabase.from("categories").insert({ ...row, sort_order: (last?.sort_order ?? 0) + 10 });
    if (error) return { error: "Couldn't create the category." };
  }
  refresh();
  return {};
}

export async function setCategoryActiveAction(id: string, active: boolean): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid category." };
  const supabase = await createClient();
  const { error } = await supabase.from("categories").update({ is_active: active }).eq("id", id);
  if (error) return { error: "Couldn't update the category." };
  refresh();
  return {};
}

/** Moves a category one place earlier or later: swaps its position with its neighbour (two writes), renumbering the whole list only when two rows tie. Same approach as lib/admin/banner-actions.ts's moveBannerAction. */
export async function moveCategoryAction(id: string, direction: "up" | "down"): Promise<{ error?: string }> {
  if (!(await admin())) return { error: "Admin access required." };
  if (!idSchema.safeParse(id).success) return { error: "Invalid category." };
  const supabase = await createClient();
  const { data } = await supabase.from("categories").select("id, sort_order").order("sort_order").order("created_at");
  const rows = data ?? [];
  const from = rows.findIndex((r) => r.id === id);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return {};

  const writes: PromiseLike<{ error: unknown }>[] = [];
  if (rows[from].sort_order !== rows[to].sort_order) {
    writes.push(supabase.from("categories").update({ sort_order: rows[to].sort_order }).eq("id", rows[from].id));
    writes.push(supabase.from("categories").update({ sort_order: rows[from].sort_order }).eq("id", rows[to].id));
  } else {
    const ids = rows.map((r) => r.id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    ids.forEach((categoryId, index) => writes.push(supabase.from("categories").update({ sort_order: (index + 1) * 10 }).eq("id", categoryId)));
  }
  const results = await Promise.all(writes);
  if (results.some((r) => r.error)) return { error: "Couldn't reorder the categories." };
  refresh();
  return {};
}

"use server";

import { revalidatePath } from "next/cache";
import { getServerUser } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/db/admin";
import { createClient } from "@/lib/db/server";
import { SEO_PAGE_KEYS, getSeoPage } from "@/lib/seo/pages";
import { seoSchema, type SeoInput } from "@/lib/validation/seo.schema";

// Admin-only. Rows are written with the ADMIN's own session (RLS `is_admin()` on site_seo is the enforcement, as for banners/categories);
// the role gate here adds the friendly message. A page with no overrides has NO row — saving "all blank, indexable" deletes it, so the table
// only ever holds real customisations.
async function gate() {
  const user = await getServerUser();
  return user && user.role === "admin" ? user : null;
}

function refresh(path: string) {
  revalidatePath(path);
  revalidatePath("/admin/seo");
  revalidatePath("/sitemap.xml");
}

export async function saveSeoPageAction(pageKey: string, raw: SeoInput): Promise<{ error?: string }> {
  const user = await gate();
  if (!user) return { error: "Admin access required." };
  const page = getSeoPage(pageKey);
  if (!page || !SEO_PAGE_KEYS.includes(page.key)) return { error: "Unknown page." };
  const parsed = seoSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details." };
  const { metaTitle, metaDescription, noindex } = parsed.data;

  const supabase = await createClient();
  if (metaTitle === null && metaDescription === null && !noindex) {
    const { error } = await supabase.from("site_seo").delete().eq("page_key", page.key);
    if (error) return { error: "Couldn't save." };
  } else {
    const { error } = await supabase.from("site_seo").upsert({ page_key: page.key, meta_title: metaTitle, meta_description: metaDescription, noindex, updated_by: user.id }, { onConflict: "page_key" });
    if (error) return { error: "Couldn't save." };
  }
  await createAdminClient().from("audit_logs").insert({ actor_id: user.id, action: "seo.page_saved", entity_type: "site_seo", entity_id: null, before_data: null, after_data: { page: page.key, noindex, customTitle: metaTitle !== null, customDescription: metaDescription !== null } as never });
  refresh(page.path);
  return {};
}

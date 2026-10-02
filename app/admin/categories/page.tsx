import { CategoryDialog } from "@/components/admin/CategoryDialog";
import { CategoryRowActions } from "@/components/admin/CategoryRowActions";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";

export const metadata = { title: "Categories — GiftPing Admin" };

export default async function AdminCategoriesPage() {
  await requireRole("admin");
  // The admin's own session: RLS (categories_select_active_or_admin) lets them see hidden categories the public can't.
  const { data: categories } = await (await createClient()).from("categories").select("*").order("sort_order").order("created_at");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Categories</h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            The gift occasions shown across the storefront — the Occasions page, the header menu, and each product&apos;s own category. Order here is the order shoppers see.
          </p>
        </div>
        <CategoryDialog />
      </div>

      {!categories || categories.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No categories yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
          {categories.map((c, i) => {
            const defaultSwatch = "#1A4731"; // theme-safe: fallback for a per-category colour the admin sets and stores in the DB, not a brand token
            const form = {
              id: c.id, name: c.name, slug: c.slug, description: c.description ?? "", themeColor: c.theme_color ?? defaultSwatch,
              metaTitle: c.meta_title ?? "", metaDescription: c.meta_description ?? "", isActive: c.is_active, isFeatured: c.is_featured,
            };
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-4 p-4">
                <span className="h-8 w-8 shrink-0 rounded-full border border-brand-dark/10" style={{ backgroundColor: c.theme_color ?? defaultSwatch }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-dark">
                    {c.name} <Badge variant={c.is_active ? "primary" : "neutral"}>{c.is_active ? "visible" : "hidden"}</Badge>
                    {c.is_featured ? <Badge variant="gold">featured</Badge> : null}
                  </p>
                  <p className="text-xs text-brand-dark/60">/categories/{c.slug}{c.description ? ` · ${c.description}` : ""}</p>
                </div>
                <div className="flex items-center gap-5">
                  <CategoryDialog initial={form} />
                  <CategoryRowActions id={c.id} active={c.is_active} first={i === 0} last={i === categories.length - 1} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

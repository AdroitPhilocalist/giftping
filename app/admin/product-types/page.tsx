import { ParentOptionsProvider, ProductTypeDialog, type ProductTypeFormValues } from "@/components/admin/ProductTypeDialog";
import { ProductTypeRowActions } from "@/components/admin/ProductTypeRowActions";
import { Badge } from "@/components/ui/Badge";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { ancestorChain, descendantIds, flattenProductTypeTree, type ProductTypeRow } from "@/lib/catalog/product-types";

export const metadata = { title: "Product types — GiftPing Admin" };

export default async function AdminProductTypesPage() {
  await requireRole("admin");
  // The admin's own session: RLS (product_types_select_active_or_admin) lets them see hidden types the public can't.
  const supabase = await createClient();
  const [{ data: types }, { data: attributes }] = await Promise.all([
    supabase.from("product_types").select("*").order("sort_order").order("created_at"),
    supabase.from("product_attributes").select("*").eq("is_active", true).order("sort_order").order("created_at"),
  ]);

  const rows: ProductTypeRow[] = (types ?? []).map((t) => ({ id: t.id, parent_id: t.parent_id, name: t.name, slug: t.slug, sort_order: t.sort_order, is_active: t.is_active }));
  const typeById = new Map((types ?? []).map((t) => [t.id, t]));
  const flat = flattenProductTypeTree(rows);
  const attrsByType = new Map<string, typeof attributes>();
  for (const a of attributes ?? []) attrsByType.set(a.product_type_id, [...(attrsByType.get(a.product_type_id) ?? []), a]);

  // First/last among OWN siblings (same parent_id), not the whole flattened list — a tree reorders within a level.
  const siblingGroups = new Map<string | null, string[]>();
  for (const r of rows) siblingGroups.set(r.parent_id, [...(siblingGroups.get(r.parent_id) ?? []), r.id].sort((a, b) => (rows.find((x) => x.id === a)!.sort_order - rows.find((x) => x.id === b)!.sort_order)));

  const allParentOptions = flattenProductTypeTree(rows);

  return (
    <ParentOptionsProvider options={allParentOptions}>
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">Product types</h1>
          <p className="mt-1 text-sm text-brand-dark/60">
            What kind of thing a product actually is — Jewellery, Candles, Flowers & Plants — separate from the occasion categories (Birthday, Wedding) on the Categories page. Each type can have subcategories and its own filterable attributes (e.g. Flavor, Placement).
          </p>
        </div>
        <ProductTypeDialog />
      </div>

      {flat.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">No product types yet. Create the first one — try &ldquo;Jewellery&rdquo;.</p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface">
          {flat.map((t) => {
            const siblings = siblingGroups.get(t.parent_id) ?? [];
            const idxInSiblings = siblings.indexOf(t.id);
            const typeAttrs = attrsByType.get(t.id) ?? [];
            const excludedIds = [t.id, ...descendantIds(rows, t.id)];
            const full = typeById.get(t.id)!;
            const form: ProductTypeFormValues = {
              id: t.id, name: t.name, slug: t.slug, description: full.description ?? "",
              iconUrl: full.icon_url ?? "", metaTitle: full.meta_title ?? "",
              metaDescription: full.meta_description ?? "", isActive: t.is_active, parentId: t.parent_id ?? "",
              attributes: typeAttrs.map((a) => ({ id: a.id, key: a.key, label: a.label, inputType: a.input_type as "select" | "multi_select", optionsText: a.options.join(", ") })),
            };
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-4 p-4" style={{ paddingLeft: `${1 + t.depth * 1.5}rem` }}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-dark">
                    {t.depth > 0 ? <span className="text-brand-dark/30">—</span> : null}
                    {t.name} <Badge variant={t.is_active ? "primary" : "neutral"}>{t.is_active ? "visible" : "hidden"}</Badge>
                    {typeAttrs.length > 0 ? <Badge variant="gold">{typeAttrs.length} attribute{typeAttrs.length === 1 ? "" : "s"}</Badge> : null}
                  </p>
                  <p className="text-xs text-brand-dark/60">/shop/{ancestorChain(rows, t.id).map((a) => a.slug).join("/")}</p>
                </div>
                <div className="flex items-center gap-5">
                  <ProductTypeDialog initial={form} excludedIds={excludedIds} />
                  <ProductTypeRowActions id={t.id} name={t.name} active={t.is_active} first={idxInSiblings === 0} last={idxInSiblings === siblings.length - 1} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
    </ParentOptionsProvider>
  );
}

import { DecisionButtons } from "@/components/admin/DecisionButtons";
import { ProductImage } from "@/components/shop/ProductImage";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/db/server";
import { requireRole } from "@/lib/auth/session";
import { formatCurrency } from "@/lib/utils/format";

export default async function AdminProductsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, short_description, description, base_price, sale_price, stock_quantity, thumbnail_url, occasion_tags, recipient_tags, vendor:vendors(business_name), category:categories(name)")
    .eq("status", "pending")
    .order("updated_at", { ascending: true });

  const products = data ?? [];

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Products awaiting review ({products.length})</h1>
      {products.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-brand-dark/15 p-8 text-center text-sm text-brand-dark/50">Queue is empty.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {products.map((product) => {
            const vendor = Array.isArray(product.vendor) ? product.vendor[0] : product.vendor;
            const category = Array.isArray(product.category) ? product.category[0] : product.category;
            return (
              <Card key={product.id} className="flex gap-4">
                <ProductImage src={product.thumbnail_url} alt={product.name} className="h-24 w-24 shrink-0 rounded-xl" sizes="96px" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-lg text-brand-dark">{product.name}</p>
                      <p className="text-xs text-brand-dark/50">
                        {vendor?.business_name} · {category?.name ?? "No category"} · {formatCurrency(product.sale_price ?? product.base_price)} · {product.stock_quantity} in stock
                      </p>
                    </div>
                    <DecisionButtons kind="product" id={product.id} />
                  </div>
                  {product.short_description ? <p className="mt-2 text-sm text-brand-dark/70">{product.short_description}</p> : null}
                  <p className="mt-1 line-clamp-3 text-xs text-brand-dark/50">{product.description}</p>
                  <p className="mt-2 text-xs text-brand-dark/50">
                    {[...product.occasion_tags, ...product.recipient_tags].join(" · ") || "No occasion/recipient tags"}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

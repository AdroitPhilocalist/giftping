import { DecisionButtons } from "@/components/admin/DecisionButtons";
import { ProductReviewDetails } from "@/components/admin/ProductReviewDetails";
import { ProductImage } from "@/components/shop/ProductImage";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/db/server";
import { requireRole } from "@/lib/auth/session";
import { captureProductSnapshots } from "@/lib/vendor/product-snapshot";
import {
  PRODUCT_APPROVED_ACTION,
  PRODUCT_VENDOR_CHANGE_ACTION,
  type ProductReviewAuditRow,
} from "@/lib/catalog/product-review";
import { formatCurrency } from "@/lib/utils/format";

type ReviewLogRow = ProductReviewAuditRow & { entity_id: string | null };

export default async function AdminProductsPage() {
  await requireRole("admin");
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("id, name, short_description, description, base_price, sale_price, stock_quantity, thumbnail_url, occasion_tags, recipient_tags, approved_at, vendor:vendors(business_name), category:categories(name)")
    .eq("status", "pending")
    .order("updated_at", { ascending: true });

  const products = data ?? [];
  const productIds = products.map((product) => product.id);

  // One query for the current full state, one for the before/after trail. The trail also needs the
  // approval marker so the diff is measured from the last approved version, not from an edit that
  // an earlier reviewer already approved.
  const snapshots = await captureProductSnapshots(supabase, productIds);
  let reviewLogs: ReviewLogRow[] = [];
  if (productIds.length > 0) {
    const { data: logs } = await supabase
      .from("audit_logs")
      .select("id, action, entity_id, before_data, after_data, created_at")
      .eq("entity_type", "product")
      .in("entity_id", productIds)
      .in("action", [PRODUCT_VENDOR_CHANGE_ACTION, PRODUCT_APPROVED_ACTION])
      .order("created_at", { ascending: false })
      .limit(2000);
    reviewLogs = (logs ?? []) as ReviewLogRow[];
  }

  const historyByProduct = new Map<string, ProductReviewAuditRow[]>();
  for (const row of reviewLogs) {
    if (!row.entity_id) continue;
    const history = historyByProduct.get(row.entity_id) ?? [];
    history.push({
      id: row.id,
      action: row.action,
      created_at: row.created_at,
      before_data: row.before_data,
      after_data: row.after_data,
    });
    historyByProduct.set(row.entity_id, history);
  }

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
                  <ProductReviewDetails
                    history={historyByProduct.get(product.id) ?? []}
                    current={snapshots.get(product.id) ?? null}
                    everApproved={Boolean(product.approved_at)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

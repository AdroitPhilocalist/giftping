import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import { ProductRowActions } from "@/components/vendor/ProductRowActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getVendorProducts, requireApprovedVendor } from "@/lib/db/vendor-portal";
import { formatCurrency } from "@/lib/utils/format";

const STATUS_LABEL: Record<string, { label: string; variant: "neutral" | "gold" | "primary"; className?: string }> = {
  pending: { label: "In review", variant: "gold" },
  approved: { label: "Live", variant: "primary" },
  active: { label: "Live", variant: "primary" },
  inactive: { label: "Hidden", variant: "neutral" },
  rejected: { label: "Needs changes", variant: "neutral", className: "bg-red-50 text-red-700" },
};

export default async function VendorProductsPage() {
  const { vendor } = await requireApprovedVendor();
  const products = await getVendorProducts(vendor.id);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl text-brand-dark">Products</h1>
        <div className="flex gap-2">
          <Button asChild variant="secondary">
            <Link href="/vendor/products/import">Import from CSV</Link>
          </Button>
          <Button asChild>
            <Link href="/vendor/products/new">Add product</Link>
          </Button>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
          You haven&apos;t added any products yet.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-brand-dark/10 rounded-2xl border border-brand-dark/10 bg-white">
          {products.map((product) => {
            const status = STATUS_LABEL[product.status] ?? STATUS_LABEL.pending;
            const category = Array.isArray(product.category) ? product.category[0] : product.category;
            return (
              <li key={product.id} className="flex items-center gap-4 p-4">
                <ProductImage src={product.thumbnail_url} alt={product.name} className="h-16 w-16 shrink-0 rounded-xl" sizes="64px" />
                <div className="min-w-0 flex-1">
                  <Link href={`/vendor/products/${product.id}`} className="truncate font-medium text-brand-dark hover:text-brand-primary">
                    {product.name}
                  </Link>
                  <p className="text-xs text-brand-dark/50">
                    {category?.name ?? "Uncategorised"} · {formatCurrency(product.sale_price ?? product.base_price)} ·{" "}
                    {product.stock_quantity} in stock
                  </p>
                  {product.status === "inactive" && !product.thumbnail_url ? (
                    <p className="mt-1 text-xs text-brand-dark/60">Draft — add a photo, then choose Resubmit to send it for review.</p>
                  ) : null}
                  {product.status === "rejected" && product.rejection_reason ? (
                    <p className="mt-1 text-xs text-red-700">Reviewer note: {product.rejection_reason}</p>
                  ) : null}
                </div>
                <Badge variant={status.variant} className={status.className}>
                  {status.label}
                </Badge>
                <ProductRowActions productId={product.id} status={product.status} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

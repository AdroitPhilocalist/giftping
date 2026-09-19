import { notFound } from "next/navigation";
import { ImageManager } from "@/components/vendor/ImageManager";
import { ProductForm } from "@/components/vendor/ProductForm";
import { Badge } from "@/components/ui/Badge";
import { getActiveCategoryOptions, getVendorProduct, requireApprovedVendor } from "@/lib/db/vendor-portal";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { vendor } = await requireApprovedVendor();
  const [product, categories] = await Promise.all([getVendorProduct(vendor.id, id), getActiveCategoryOptions()]);
  if (!product) notFound();

  const images = [...product.images].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-3xl text-brand-dark">{product.name}</h1>
        <Badge variant={product.status === "active" ? "primary" : "gold"}>
          {product.status === "active" ? "Live" : product.status === "inactive" ? "Hidden" : product.status === "rejected" ? "Needs changes" : "In review"}
        </Badge>
      </div>
      {product.status === "rejected" && product.rejection_reason ? (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">Reviewer note: {product.rejection_reason}</p>
      ) : null}

      <ImageManager productId={product.id} images={images} />

      <ProductForm
        productId={product.id}
        categories={categories}
        defaultValues={{
          name: product.name,
          categoryId: product.category_id ?? "",
          shortDescription: product.short_description ?? "",
          description: product.description ?? "",
          basePrice: product.base_price,
          salePrice: product.sale_price ?? undefined,
          sku: product.sku ?? "",
          stockQuantity: product.stock_quantity,
          weightGrams: product.weight_grams ?? undefined,
          gstRate: product.gst_rate,
          hsnCode: product.hsn_code ?? "",
          tags: product.tags.join(", "),
          occasionTags: product.occasion_tags as never,
          recipientTags: product.recipient_tags as never,
          variants: product.variants
            .filter((v) => v.is_active)
            .map((v) => ({ id: v.id, name: v.name, value: v.value, priceAdjustment: v.price_adjustment, stockQuantity: v.stock_quantity })),
        }}
      />
    </div>
  );
}

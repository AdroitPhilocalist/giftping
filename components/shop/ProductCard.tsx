import Link from "next/link";
import { Star } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductImage";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils/format";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  base_price: number;
  sale_price: number | null;
  thumbnail_url: string | null;
  average_rating: number;
  review_count: number;
  stock_quantity: number;
  is_in_house: boolean;
  vendor: { id: string; business_name: string; slug: string } | null;
}

export function ProductCard({
  product,
  isWishlisted = false,
}: {
  product: ProductCardData;
  isWishlisted?: boolean;
}) {
  const hasDiscount = product.sale_price !== null && product.sale_price < product.base_price;
  const discountPercent = hasDiscount
    ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
    : 0;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-brand-dark/10 bg-white transition-shadow hover:shadow-lg hover:shadow-brand-dark/5">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative">
          <ProductImage
            src={product.thumbnail_url}
            alt={product.name}
            className="aspect-square w-full transition-transform duration-300 group-hover:scale-[1.03]"
          />
          {hasDiscount ? (
            <Badge variant="gold" className="absolute left-3 top-3">
              {discountPercent}% OFF
            </Badge>
          ) : null}
        </div>
      </Link>

      <WishlistButton
        productId={product.id}
        initialWishlisted={isWishlisted}
        className="absolute right-3 top-3"
      />

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <span className="text-xs font-medium text-brand-secondary-dark">
          {product.is_in_house ? "GiftPing Originals" : product.vendor?.business_name}
        </span>
        <Link href={`/products/${product.slug}`}>
          <h3 className="line-clamp-2 font-heading text-base text-brand-dark hover:text-brand-primary">
            {product.name}
          </h3>
        </Link>
        {product.review_count > 0 ? (
          <div className="flex items-center gap-1 text-xs text-brand-dark/60">
            <Star className="h-3.5 w-3.5 fill-brand-secondary text-brand-secondary" />
            <span>{product.average_rating.toFixed(1)}</span>
            <span>({product.review_count})</span>
          </div>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-heading text-lg text-brand-dark">
            {formatCurrency(hasDiscount ? product.sale_price! : product.base_price)}
          </span>
          {hasDiscount ? (
            <span className="text-sm text-brand-dark/40 line-through">
              {formatCurrency(product.base_price)}
            </span>
          ) : null}
        </div>
        {product.stock_quantity === 0 ? (
          <span className="text-xs font-medium text-red-600">Out of Stock</span>
        ) : null}
      </div>
    </div>
  );
}

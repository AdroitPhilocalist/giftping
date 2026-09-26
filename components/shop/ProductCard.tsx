import Link from "next/link";
import { Star } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductImage";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { formatCurrency } from "@/lib/utils/format";
import "./shop.css";

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
    <article className="gift-tag group relative flex h-full flex-col">
      <span className="gift-tag-loop" aria-hidden="true" />
      <div className="gift-tag-body flex flex-1 flex-col">
        <span className="gift-tag-hole" aria-hidden="true" />
        <div className="gift-tag-photo">
          <Link href={`/products/${product.slug}`} className="block" aria-label={product.name}>
            <ProductImage src={product.thumbnail_url} alt="" className="aspect-[5/6] w-full transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
          </Link>
          {hasDiscount ? <span className="gift-seal"><span>{discountPercent}%<br />OFF</span></span> : null}
          <WishlistButton productId={product.id} initialWishlisted={isWishlisted} className="absolute right-2 top-2 z-[2]" />
        </div>
        <p className="gift-price">
          {formatCurrency(hasDiscount ? product.sale_price! : product.base_price)}
          {hasDiscount ? <span className="ml-1.5 font-sans text-[0.7rem] text-brand-dark/40 line-through">{formatCurrency(product.base_price)}</span> : null}
        </p>

        <div className="flex flex-1 flex-col gap-1 px-2 pb-1.5 pt-2.5">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-brand-secondary-dark">
            {product.is_in_house ? "GiftPing Originals" : product.vendor?.business_name}
          </span>
          <Link href={`/products/${product.slug}`}>
            <h3 className="line-clamp-2 font-heading text-[1.05rem] leading-snug text-brand-dark transition-colors hover:text-brand-secondary-dark">{product.name}</h3>
          </Link>
          {product.review_count > 0 ? (
            <div className="mt-auto flex items-center gap-1 pt-0.5 text-xs text-brand-dark/60">
              <Star className="h-3.5 w-3.5 fill-brand-secondary text-brand-secondary" />
              <span>{product.average_rating.toFixed(1)}</span>
              <span>({product.review_count})</span>
            </div>
          ) : null}
          {product.stock_quantity === 0 ? <span className="text-xs font-medium text-red-600">Out of Stock</span> : null}
        </div>
      </div>
    </article>
  );
}

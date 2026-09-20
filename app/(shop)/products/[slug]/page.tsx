import { notFound } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import { ProductGallery } from "@/components/shop/ProductGallery";
import { ProductBuyBox } from "@/components/shop/ProductBuyBox";
import { ProductCard } from "@/components/shop/ProductCard";
import { ReviewList } from "@/components/shop/ReviewList";
import { VendorLogo } from "@/components/shop/VendorLogo";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { Badge } from "@/components/ui/Badge";
import { getProductBySlug, getRelatedProducts } from "@/lib/db/products";
import { getProductReviews } from "@/lib/db/reviews";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const user = await getServerUser();
  const [related, { reviews, total: reviewTotal }, wishlistIds] = await Promise.all([
    getRelatedProducts(product.id, product.category_id),
    getProductReviews(product.id),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const images = product.images.length > 0
    ? [...product.images].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0) || a.sort_order - b.sort_order)
    : product.thumbnail_url
      ? [{ url: product.thumbnail_url, alt_text: product.name }]
      : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs uppercase tracking-widest text-brand-dark/50">
        <Link href="/vendors" className="hover:underline">
          Boutiques
        </Link>{" "}
        {product.vendor ? (
          <>
            /{" "}
            <Link href={`/vendors/${product.vendor.slug}`} className="hover:underline">
              {product.vendor.business_name}
            </Link>{" "}
          </>
        ) : null}
        / {product.name}
      </p>

      <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} productName={product.name} />

        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-heading text-3xl text-brand-dark">{product.name}</h1>
              {product.short_description ? (
                <p className="mt-1 text-brand-dark/60">{product.short_description}</p>
              ) : null}
            </div>
            <WishlistButton
              productId={product.id}
              initialWishlisted={wishlistIds.has(product.id)}
              className="static shadow-none"
            />
          </div>

          {product.review_count > 0 ? (
            <div className="mt-2 flex items-center gap-1 text-sm text-brand-dark/60">
              <Star className="h-4 w-4 fill-brand-secondary text-brand-secondary" />
              <span className="font-medium text-brand-dark">{product.average_rating.toFixed(1)}</span>
              <span>({product.review_count} reviews)</span>
              {product.total_sold > 0 ? <span>· {product.total_sold}+ sold</span> : null}
            </div>
          ) : null}

          <div className="mt-6">
            <ProductBuyBox
              productId={product.id}
              basePrice={product.base_price}
              salePrice={product.sale_price}
              stockQuantity={product.stock_quantity}
              variants={product.variants}
            />
          </div>

          {product.vendor ? (
            <Link
              href={`/vendors/${product.vendor.slug}`}
              className="mt-6 flex items-center gap-3 rounded-2xl border border-brand-dark/10 p-4 hover:shadow-sm"
            >
              <VendorLogo url={product.vendor.logo_url} name={product.vendor.business_name} sizeClass="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm text-brand-dark">{product.vendor.business_name}</p>
                {product.vendor.short_description ? (
                  <p className="truncate text-xs text-brand-dark/60">{product.vendor.short_description}</p>
                ) : null}
              </div>
              {product.vendor.review_count > 0 ? (
                <Badge variant="gold" className="gap-1 shrink-0">
                  <Star className="h-3 w-3 fill-current" />
                  {product.vendor.average_rating.toFixed(1)}
                </Badge>
              ) : null}
            </Link>
          ) : null}
        </div>
      </div>

      {product.description ? (
        <div className="mt-12 max-w-3xl">
          <h2 className="font-heading text-xl text-brand-dark">About This Gift</h2>
          <p className="mt-3 whitespace-pre-line text-brand-dark/70">{product.description}</p>
        </div>
      ) : null}

      <div className="mt-12 max-w-3xl">
        <h2 className="font-heading text-xl text-brand-dark">
          Reviews {reviewTotal > 0 ? `(${reviewTotal})` : ""}
        </h2>
        <div className="mt-4">
          <ReviewList reviews={reviews} total={reviewTotal} />
        </div>
      </div>

      {related.length > 0 ? (
        <div className="mt-12">
          <h2 className="font-heading text-xl text-brand-dark">You May Also Like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} isWishlisted={wishlistIds.has(item.id)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

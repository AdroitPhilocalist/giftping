import Link from "next/link";
import { Robin } from "@/components/art/Robin";
import { requireRole } from "@/lib/auth/session";
import { getWishlistProducts } from "@/lib/db/wishlists";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { UnavailableWishlistCard } from "@/components/shop/UnavailableWishlistCard";
import { Button } from "@/components/ui/Button";

export default async function WishlistPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const items = await getWishlistProducts(user.id);
  const products = items.flatMap((item) => (item.product ? [item.product] : []));
  const unavailable = items.filter((item) => !item.product);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl text-brand-dark">My Wishlist</h1>
          {items.length > 0 ? (
            <p className="mt-1 text-sm text-brand-dark/55">
              {items.length} saved {items.length === 1 ? "gift" : "gifts"}
              {unavailable.length > 0 ? ` · ${unavailable.length} temporarily unavailable` : ""}
            </p>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-dashed border-brand-dark/15 p-16 text-center">
          <Robin pose="heart" className="w-32" />
          <p className="text-brand-dark/60">Nothing saved yet — tap the heart on any gift to keep it here.</p>
          <Button asChild>
            <Link href="/">Explore the Mall</Link>
          </Button>
        </div>
      ) : (
        <>
          {products.length > 0 ? (
            <ProductGrid className="mt-8">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} isWishlisted />
              ))}
            </ProductGrid>
          ) : null}

          {unavailable.length > 0 ? (
            <section className={products.length > 0 ? "mt-12" : "mt-8"}>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-xl text-brand-dark">Temporarily unavailable</h2>
                <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-semibold text-brand-secondary-dark">
                  {unavailable.length}
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-sm text-brand-dark/55">
                These saved gifts aren&apos;t available right now. They&apos;ll reappear here automatically if they become live again.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
                {unavailable.map((item) => (
                  <UnavailableWishlistCard key={item.product_id} productId={item.product_id} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

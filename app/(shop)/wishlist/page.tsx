import Link from "next/link";
import { Heart } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getWishlistProducts } from "@/lib/db/wishlists";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/Button";

export default async function WishlistPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const items = await getWishlistProducts(user.id);
  const products = items.map((item) => item.product).filter((p) => p !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-brand-dark">My Wishlist</h1>

      {products.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-dark/15 p-16 text-center">
          <Heart className="h-10 w-10 text-brand-dark/20" />
          <p className="text-brand-dark/60">Nothing saved yet — tap the heart on any gift to keep it here.</p>
          <Button asChild>
            <Link href="/">Explore the Mall</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} isWishlisted />
          ))}
        </div>
      )}
    </div>
  );
}

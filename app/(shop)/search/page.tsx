import { Robin } from "@/components/art/Robin";
import { SearchBar } from "@/components/shop/SearchBar";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { searchProducts } from "@/lib/search";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";

export const metadata = { title: "Search — GiftPing" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const user = await getServerUser();
  const [results, wishlistIds] = await Promise.all([
    query ? searchProducts(query) : Promise.resolve([]),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SearchBar defaultValue={query} className="mx-auto max-w-xl" />

      <div className="mt-8">
        {!query ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Robin pose="search" className="w-32" />
            <p className="text-brand-dark/60">Search for gifts, occasions, or people.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Robin pose="search" className="w-36" />
            <h2 className="font-heading text-2xl text-brand-dark">Nothing found for &ldquo;{query}&rdquo;</h2>
            <p className="max-w-sm text-brand-dark/60">Try a different word — an occasion, a person, or something they love.</p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-brand-dark/60">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
            </p>
            <ProductGrid>
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                />
              ))}
            </ProductGrid>
          </>
        )}
      </div>
    </div>
  );
}

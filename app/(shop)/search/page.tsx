import { SearchBar } from "@/components/shop/SearchBar";
import { ProductCard } from "@/components/shop/ProductCard";
import { searchProducts } from "@/lib/search";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";

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
          <p className="text-center text-brand-dark/50">Search for gifts, occasions, or people.</p>
        ) : results.length === 0 ? (
          <p className="text-center text-brand-dark/50">
            No results for &ldquo;{query}&rdquo;. Try a different search term.
          </p>
        ) : (
          <>
            <p className="mb-4 text-sm text-brand-dark/60">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isWishlisted={wishlistIds.has(product.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

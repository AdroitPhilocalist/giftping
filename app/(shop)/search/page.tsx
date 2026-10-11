import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { SearchBar } from "@/components/shop/SearchBar";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { getRelatedBrowseLinks, searchProducts } from "@/lib/search";
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
    query ? searchProducts(query) : Promise.resolve({ products: [], fuzzy: false }),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);
  const { products, fuzzy } = results;
  // Nothing found even with the typo-tolerant fallback — offer somewhere else to go instead of a dead end.
  const related = query && products.length === 0 ? await getRelatedBrowseLinks(query) : { categories: [], vendors: [] };
  const hasRelated = related.categories.length > 0 || related.vendors.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <SearchBar defaultValue={query} className="mx-auto max-w-xl" />

      <div className="mt-8">
        {!query ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Robin pose="search" className="w-32" />
            <p className="text-brand-dark/60">Search for gifts, occasions, or people.</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Robin pose="search" className="w-36" />
            <h2 className="font-heading text-2xl text-brand-dark">Nothing found for &ldquo;{query}&rdquo;</h2>
            <p className="max-w-sm text-brand-dark/60">Try a different word — an occasion, a person, or something they love.</p>
            {hasRelated ? (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                {related.categories.map((c) => (
                  <Link key={c.slug} href={`/categories/${c.slug}`} className="inline-flex items-center gap-1 rounded-full border border-brand-dark/15 bg-brand-surface px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-accent">
                    {c.name} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
                {related.vendors.map((v) => (
                  <Link key={v.slug} href={`/vendors/${v.slug}`} className="inline-flex items-center gap-1 rounded-full border border-brand-dark/15 bg-brand-surface px-4 py-2 text-sm font-medium text-brand-dark transition-colors hover:bg-brand-accent">
                    {v.name} <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-brand-dark/60">
              {fuzzy ? (
                <>No exact matches — showing close results for &ldquo;{query}&rdquo;</>
              ) : (
                <>
                  {products.length} result{products.length === 1 ? "" : "s"} for &ldquo;{query}&rdquo;
                </>
              )}
            </p>
            <ProductGrid>
              {products.map((product) => (
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

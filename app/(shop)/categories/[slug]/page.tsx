import { notFound } from "next/navigation";
import Link from "next/link";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { Pagination } from "@/components/shop/Pagination";
import { getCategoryBySlug } from "@/lib/db/categories";
import { getVendorsForCategory } from "@/lib/db/vendors";
import { listProducts, type ProductListFilters } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Number(sp.page ?? "1") || 1;
  const filters: ProductListFilters = {
    categorySlug: slug,
    vendorSlug: sp.vendor || undefined,
    occasionTag: sp.occasion || undefined,
    recipientTag: sp.recipient || undefined,
    inStockOnly: sp.inStock === "true",
    sort: (sp.sort as ProductListFilters["sort"]) || "popularity",
    page,
  };

  const user = await getServerUser();
  const [{ products, total, totalPages }, vendors, wishlistIds] = await Promise.all([
    listProducts(filters),
    getVendorsForCategory(category.id),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (sp.vendor) params.set("vendor", sp.vendor);
    if (sp.occasion) params.set("occasion", sp.occasion);
    if (sp.recipient) params.set("recipient", sp.recipient);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.inStock) params.set("inStock", sp.inStock);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div
      className="border-b border-brand-dark/10 py-10"
      style={{ backgroundColor: category.theme_color ? `${category.theme_color}0d` : undefined }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs uppercase tracking-widest text-brand-dark/50">
          <Link href="/categories" className="hover:underline">
            Occasions
          </Link>{" "}
          / {category.name}
        </p>
        <h1 className="mt-2 font-heading text-3xl text-brand-dark sm:text-4xl">{category.name}</h1>
        {category.description ? <p className="mt-2 max-w-2xl text-brand-dark/60">{category.description}</p> : null}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ProductFilters
              vendors={vendors}
              current={{
                vendor: sp.vendor,
                occasion: sp.occasion,
                recipient: sp.recipient,
                sort: sp.sort,
                inStock: sp.inStock,
              }}
            />
          </aside>

          <div>
            <p className="mb-4 text-sm text-brand-dark/60">
              {total} {total === 1 ? "product" : "products"} found
            </p>
            {products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
                No products match these filters yet. Try adjusting them.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isWishlisted={wishlistIds.has(product.id)}
                  />
                ))}
              </div>
            )}
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </div>
        </div>
      </div>
    </div>
  );
}

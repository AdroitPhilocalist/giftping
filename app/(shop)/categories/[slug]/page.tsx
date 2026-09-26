import { notFound } from "next/navigation";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { WorldHero } from "@/components/shop/WorldHero";
import { Pagination } from "@/components/shop/Pagination";
import { getActiveCategories, getCategoryBySlug } from "@/lib/db/categories";
import { getVendorsForCategory } from "@/lib/db/vendors";
import { listProducts, type ProductListFilters } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  // category gates the page, but user/theme don't depend on it — fetch all three together.
  const [category, user, theme, allCategories] = await Promise.all([getCategoryBySlug(slug), getServerUser(), getActiveTheme(), getActiveCategories()]);
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

  // every filter option is a link to this page with one thing changed
  function hrefFor(patch: Partial<Record<"vendor" | "occasion" | "recipient" | "sort" | "inStock", string | undefined>>) {
    const merged = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  const world = siteImage(`world-${slug}`, theme.id);

  // "Birthday" -> "Birthday World"; "Corporate Gifting" -> accent on the last word; "For Her" stays as it is
  const words = category.name.split(" ");
  const oneWord = words.length === 1;
  const lead = oneWord ? category.name : words.slice(0, -1).join(" ");
  const tail = oneWord ? "World" : words[words.length - 1];

  return (
    <div>
      <WorldHero slug={slug} image={world} lead={lead} tail={tail} description={category.description} name={category.name} siblings={allCategories.map((c) => ({ slug: c.slug, name: c.name }))} />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <ShopFilters vendors={vendors} current={{ vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock }} hrefFor={hrefFor} />
          </aside>

          <div>
            <p className="mb-2 font-heading text-lg italic text-brand-dark/70">
              {total} {total === 1 ? "gift" : "gifts"} found
            </p>
            {products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
                No products match these filters yet. Try adjusting them.
              </p>
            ) : (
              <ProductGrid>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />
                ))}
              </ProductGrid>
            )}
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </div>
        </div>
      </div>
    </div>
  );
}

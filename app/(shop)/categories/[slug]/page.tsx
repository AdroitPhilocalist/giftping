import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLEAR_ALL, normalizeSearchParams, pageNumber, priceRange, sortValue, type RawSearchParams } from "@/lib/shop/filters";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { SpotlightSection } from "@/components/motion/SpotlightSection";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { FilterAction } from "@/components/shop/ShopNavigation";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { WorldHero } from "@/components/shop/WorldHero";
import { Pagination } from "@/components/shop/Pagination";
import { getActiveCategories, getCategoryBySlug } from "@/lib/db/categories";
import { getVendorsForCategory } from "@/lib/db/vendors";
import { listProducts, type ProductListFilters } from "@/lib/db/products";
import { worldTagFor } from "@/lib/catalog/tags";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { SEO_LIMITS, truncateText } from "@/lib/seo/pages";
import { baseOpenGraph } from "@/lib/seo/site";

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<RawSearchParams> }): Promise<Metadata> {
  const { slug } = await params;
  const sp = normalizeSearchParams(await searchParams);
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  // The admin's own SEO text (set in /admin/categories) wins; otherwise build something sensible from what the category already says.
  const title = category.meta_title?.trim() || `${category.name} — GiftPing`;
  const description =
    category.meta_description?.trim() || truncateText(category.description, SEO_LIMITS.descriptionIdeal) || `Explore ${category.name} gifts from GiftPing's boutiques.`;
  const path = `/categories/${slug}`;
  // Any query string is a filter/sort/page variant of the same category. Keep only the plain URL
  // indexable, and don't ask crawlers to follow the filter links into the combinatorial graph.
  const hasQuery = Object.keys(sp).length > 0;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph(), title, description, url: path },
    ...(hasQuery ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
}) {
  const { slug } = await params;
  const sp = normalizeSearchParams(await searchParams);

  // category gates the page, but user/theme don't depend on it — fetch all three together.
  const [category, user, theme, allCategories] = await Promise.all([getCategoryBySlug(slug), getServerUser(), getActiveTheme(), getActiveCategories()]);
  if (!category) notFound();

  // Birthday/Anniversary/For Her… are both a category and a tag: inside that world the matching tag filter would only repeat the world's own choice (see worldTagFor)
  const worldTag = worldTagFor(slug);
  const page = pageNumber(sp.page);
  const { minPrice, maxPrice } = priceRange(sp.minPrice, sp.maxPrice);
  const sortParam = sortValue(sp.sort);
  const inStockParam = sp.inStock === "true" ? "true" : undefined;
  const filters: ProductListFilters = {
    categorySlug: slug,
    vendorSlug: sp.vendor || undefined,
    occasionTag: sp.occasion || undefined,
    recipientTag: sp.recipient || undefined,
    inStockOnly: inStockParam === "true",
    sort: (sortParam as ProductListFilters["sort"]) || "popularity",
    minPrice,
    maxPrice,
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
    if (sortParam) params.set("sort", sortParam);
    if (inStockParam) params.set("inStock", inStockParam);
    if (minPrice !== undefined) params.set("minPrice", String(minPrice));
    if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  // every filter option is an action that updates this page with one thing changed
  function hrefFor(patch: Partial<Record<"vendor" | "occasion" | "recipient" | "sort" | "inStock" | "minPrice" | "maxPrice", string | undefined>>) {
    const merged = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sortParam, inStock: inStockParam, minPrice: minPrice !== undefined ? String(minPrice) : undefined, maxPrice: maxPrice !== undefined ? String(maxPrice) : undefined, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  // Inside a world the group it already answers is left out of the filters (see worldTagFor)
  const hide = worldTag && !sp[worldTag.kind] ? worldTag.kind : undefined;
  const current = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sortParam, inStock: inStockParam, minPrice: minPrice !== undefined ? String(minPrice) : undefined, maxPrice: maxPrice !== undefined ? String(maxPrice) : undefined };
  const anyFilter = Boolean(sp.vendor || sp.occasion || sp.recipient || inStockParam || minPrice !== undefined || maxPrice !== undefined);

  const world = siteImage(`world-${slug}`, theme.id);

  // "Birthday" -> "Birthday World"; "Corporate Gifting" -> accent on the last word; "For Her" stays as it is
  const words = category.name.split(" ");
  const oneWord = words.length === 1;
  const lead = oneWord ? category.name : words.slice(0, -1).join(" ");
  const tail = oneWord ? "World" : words[words.length - 1];

  return (
    <div>
      <WorldHero slug={slug} image={world} lead={lead} tail={tail} description={category.description} name={category.name} siblings={allCategories.map((c) => ({ slug: c.slug, name: c.name }))} />

      <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[264px_1fr] lg:gap-8">
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <ShopFilters vendors={vendors} hide={hide} current={current} hrefFor={hrefFor} />
          </aside>

          <div>
            <ShopToolbar total={total} vendors={vendors} hide={hide} current={current} hrefFor={hrefFor} />
            {products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
                {anyFilter ? (
                  <>
                    No gifts match these filters yet.{" "}
                    <FilterAction href={hrefFor(CLEAR_ALL)} className="font-medium text-brand-secondary-dark underline">Clear all filters</FilterAction>
                  </>
                ) : (
                  <>
                    Our boutiques are still adding gifts to {category.name}.{" "}
                    <Link href="/categories" className="font-medium text-brand-secondary-dark underline">Browse other categories</Link>
                  </>
                )}
              </p>
            ) : (
              <SpotlightSection>
                <ProductGrid>
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />
                  ))}
                </ProductGrid>
              </SpotlightSection>
            )}
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </div>
        </div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CLEAR_ALL } from "@/lib/shop/filters";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ShopFilters } from "@/components/shop/ShopFilters";
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

// Filter/sort variations of a category are the same content under many URLs — keep them out of the index and point search engines at the plain page.
const FILTER_PARAMS = ["sort", "vendor", "occasion", "recipient", "inStock", "minPrice", "maxPrice"] as const;

export async function generateMetadata({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { slug } = await params;
  const sp = await searchParams;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  // The admin's own SEO text (set in /admin/categories) wins; otherwise build something sensible from what the category already says.
  const title = category.meta_title?.trim() || `${category.name} — GiftPing`;
  const description =
    category.meta_description?.trim() || truncateText(category.description, SEO_LIMITS.descriptionIdeal) || `Explore ${category.name} gifts from GiftPing's boutiques.`;
  const path = `/categories/${slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph(), title, description, url: path },
    ...(FILTER_PARAMS.some((k) => sp[k]) ? { robots: { index: false, follow: true } } : {}),
  };
}

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

  // Birthday/Anniversary/For Her… are both a category and a tag: inside that world the matching tag filter would only repeat the world's own choice (see worldTagFor)
  const worldTag = worldTagFor(slug);
  const page = Number(sp.page ?? "1") || 1;
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;
  const filters: ProductListFilters = {
    categorySlug: slug,
    vendorSlug: sp.vendor || undefined,
    occasionTag: sp.occasion || undefined,
    recipientTag: sp.recipient || undefined,
    inStockOnly: sp.inStock === "true",
    sort: (sp.sort as ProductListFilters["sort"]) || "popularity",
    minPrice: minPrice !== undefined && Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice !== undefined && Number.isFinite(maxPrice) ? maxPrice : undefined,
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
    if (sp.minPrice) params.set("minPrice", sp.minPrice);
    if (sp.maxPrice) params.set("maxPrice", sp.maxPrice);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  // every filter option is a link to this page with one thing changed
  function hrefFor(patch: Partial<Record<"vendor" | "occasion" | "recipient" | "sort" | "inStock" | "minPrice" | "maxPrice", string | undefined>>) {
    const merged = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock, minPrice: sp.minPrice, maxPrice: sp.maxPrice, ...patch };
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `/categories/${slug}${qs ? `?${qs}` : ""}`;
  }

  // Inside a world the group it already answers is left out of the filters (see worldTagFor)
  const hide = worldTag && !sp[worldTag.kind] ? worldTag.kind : undefined;
  const current = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock, minPrice: sp.minPrice, maxPrice: sp.maxPrice };

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
                No gifts match these filters yet.{" "}
                <Link href={hrefFor(CLEAR_ALL)} className="font-medium text-brand-secondary-dark underline">Clear all filters</Link>
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

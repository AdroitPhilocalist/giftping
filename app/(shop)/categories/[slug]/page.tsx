import { notFound } from "next/navigation";
import Link from "next/link";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { HeroBackdrop } from "@/components/art/HeroBackdrop";
import { Robin } from "@/components/art/Robin";
import { Jaali } from "@/components/ornaments/Jaali";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { Pagination } from "@/components/shop/Pagination";
import { getCategoryBySlug } from "@/lib/db/categories";
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

  const world = siteImage(`world-${slug}`, (await getActiveTheme()).id);

  // "Birthday" -> "Birthday World"; "Corporate Gifting" -> accent on the last word; "For Her" stays as it is
  const words = category.name.split(" ");
  const oneWord = words.length === 1;
  const lead = oneWord ? category.name : words.slice(0, -1).join(" ");
  const tail = oneWord ? "World" : words[words.length - 1];

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-brand-dark/[0.06] bg-brand-accent/70">
        {world ? (
          <HeroBackdrop image={world} priority />
        ) : (
          <Jaali className="opacity-[0.07]" />
        )}
        <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8 lg:py-20">
          <div className="rise max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/60">
              <Link href="/categories" className="hover:text-brand-secondary-dark">Occasions</Link> <span className="text-brand-secondary">›</span> {category.name}
            </p>
            <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl lg:text-6xl">
              {lead} <span className="accent-word">{tail}</span>
            </h1>
            {category.description ? <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-dark/70">{category.description}</p> : null}
          </div>
          {world ? null : (
            <div className="hidden items-end gap-1 md:flex" aria-hidden="true">
              <Robin className="float-slow w-24" />
              <GiftBoxArt tone="green" className="-ml-3 w-24" />
              <GiftBoxArt tone="copper" className="-ml-6 w-16" />
            </div>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
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

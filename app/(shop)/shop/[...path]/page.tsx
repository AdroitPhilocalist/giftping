import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { SpotlightSection } from "@/components/motion/SpotlightSection";
import { ShopFilters } from "@/components/shop/ShopFilters";
import { ShopToolbar } from "@/components/shop/ShopToolbar";
import { Pagination } from "@/components/shop/Pagination";
import { getActiveProductAttributes, getActiveProductTypes } from "@/lib/db/product-types";
import { getVendorsForProductTypes } from "@/lib/db/vendors";
import { listProducts, type ProductListFilters } from "@/lib/db/products";
import { ancestorChain, descendantIds } from "@/lib/catalog/product-types";
import { clearAllPatch, decodeAttrValues, type AttributeFilterSection, type FilterPatch } from "@/lib/shop/filters";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { SEO_LIMITS, truncateText } from "@/lib/seo/pages";
import { baseOpenGraph } from "@/lib/seo/site";
import { breadcrumbJsonLd, jsonLdScript } from "@/lib/seo/structured-data";

// Filter/sort variations are the same content under many URLs — keep them out of the index.
const FILTER_PARAMS_PREFIX = ["sort", "vendor", "occasion", "recipient", "inStock", "minPrice", "maxPrice"] as const;

async function resolve(path: string[]) {
  const slug = path[path.length - 1];
  const [types, attributes] = await Promise.all([getActiveProductTypes(), getActiveProductAttributes()]);
  const productType = slug ? (types.find((t) => t.slug === slug) ?? null) : null;
  // The one true URL for a type is its full path through the tree (/shop/jewellery/necklaces) — a shorter or reordered path is a duplicate of it.
  const canonical = productType ? `/shop/${ancestorChain(types, productType.id).map((t) => t.slug).join("/")}` : null;
  return { productType, types, attributes, canonical };
}

export async function generateMetadata({ params, searchParams }: { params: Promise<{ path: string[] }>; searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const { path } = await params;
  const sp = await searchParams;
  const { productType, canonical } = await resolve(path);
  if (!productType || !canonical) return {};
  const title = productType.meta_title?.trim() || `${productType.name} — GiftPing`;
  const description = productType.meta_description?.trim() || truncateText(productType.description, SEO_LIMITS.descriptionIdeal) || `Shop ${productType.name} gifts from GiftPing's boutiques.`;
  const isFiltered = FILTER_PARAMS_PREFIX.some((k) => sp[k]) || Object.keys(sp).some((k) => k.startsWith("attr_"));
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...baseOpenGraph(), title, description, url: canonical },
    ...(isFiltered ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function ShopTypePage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string[] }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { path } = await params;
  const sp = await searchParams;
  const [{ productType, types, attributes, canonical }, user] = await Promise.all([resolve(path), getServerUser()]);
  if (!productType || !canonical) notFound();
  if (`/shop/${path.join("/")}` !== canonical) {
    const query = new URLSearchParams(Object.entries(sp).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    permanentRedirect(`${canonical}${query ? `?${query}` : ""}`);
  }

  const typeIds = [productType.id, ...descendantIds(types, productType.id)];
  const chainIds = new Set(ancestorChain(types, productType.id).map((t) => t.id));
  const effectiveAttributes = attributes.filter((a) => chainIds.has(a.product_type_id));

  const page = Number(sp.page ?? "1") || 1;
  const minPrice = sp.minPrice ? Number(sp.minPrice) : undefined;
  const maxPrice = sp.maxPrice ? Number(sp.maxPrice) : undefined;

  const attributeFilters: Record<string, string[]> = {};
  for (const a of effectiveAttributes) {
    const values = decodeAttrValues(sp[`attr_${a.id}`]);
    if (values.length > 0) attributeFilters[a.id] = values;
  }

  const filters: ProductListFilters = {
    productTypeIds: typeIds,
    vendorSlug: sp.vendor || undefined,
    occasionTag: sp.occasion || undefined,
    recipientTag: sp.recipient || undefined,
    inStockOnly: sp.inStock === "true",
    sort: (sp.sort as ProductListFilters["sort"]) || "popularity",
    minPrice: minPrice !== undefined && Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: maxPrice !== undefined && Number.isFinite(maxPrice) ? maxPrice : undefined,
    attributes: Object.keys(attributeFilters).length > 0 ? attributeFilters : undefined,
    page,
  };

  const [{ products, total, totalPages }, vendors, wishlistIds] = await Promise.all([
    listProducts(filters),
    getVendorsForProductTypes(typeIds),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const attrParamKeys = effectiveAttributes.map((a) => `attr_${a.id}`);
  const urlPath = canonical;

  function buildHref(nextPage: number) {
    const params = new URLSearchParams();
    if (sp.vendor) params.set("vendor", sp.vendor);
    if (sp.occasion) params.set("occasion", sp.occasion);
    if (sp.recipient) params.set("recipient", sp.recipient);
    if (sp.sort) params.set("sort", sp.sort);
    if (sp.inStock) params.set("inStock", sp.inStock);
    if (sp.minPrice) params.set("minPrice", sp.minPrice);
    if (sp.maxPrice) params.set("maxPrice", sp.maxPrice);
    for (const k of attrParamKeys) if (sp[k]) params.set(k, sp[k]!);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return `${urlPath}${qs ? `?${qs}` : ""}`;
  }

  function hrefFor(patch: FilterPatch) {
    const merged: Record<string, string | undefined> = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock, minPrice: sp.minPrice, maxPrice: sp.maxPrice };
    for (const k of attrParamKeys) merged[k] = sp[k];
    Object.assign(merged, patch);
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, v);
    const qs = params.toString();
    return `${urlPath}${qs ? `?${qs}` : ""}`;
  }

  const current = { vendor: sp.vendor, occasion: sp.occasion, recipient: sp.recipient, sort: sp.sort, inStock: sp.inStock, minPrice: sp.minPrice, maxPrice: sp.maxPrice };
  const attributeSections: AttributeFilterSection[] = effectiveAttributes.map((a) => ({
    key: a.id,
    label: a.label,
    inputType: a.input_type,
    options: a.options,
    selected: decodeAttrValues(sp[`attr_${a.id}`]),
  }));

  const chain = ancestorChain(types, productType.id);
  const crumbs = [{ name: "Home", path: "/" }, { name: "Shop by Type", path: "/shop" }, ...chain.map((t, i) => ({ name: t.name, path: `/shop/${chain.slice(0, i + 1).map((c) => c.slug).join("/")}` }))];

  // Navigation inside the tree: a type with subcategories offers them; a last-level type offers its siblings, so a shopper can hop sideways without going back up.
  const subcategories = types.filter((t) => t.parent_id === productType.id);
  const parentType = productType.parent_id ? types.find((t) => t.id === productType.parent_id) : undefined;
  const siblings = subcategories.length === 0 && parentType ? types.filter((t) => t.parent_id === parentType.id) : [];
  const chips = subcategories.length > 0 ? subcategories : siblings;
  const chipsLabel = subcategories.length > 0 ? `In ${productType.name}` : parentType ? `More in ${parentType.name}` : "";
  const chipHref = (t: { id: string; slug: string }) => `/shop/${ancestorChain(types, t.id).map((c) => c.slug).join("/")}`;
  const anyFilter = Object.keys(attributeFilters).length > 0 || Boolean(sp.vendor || sp.occasion || sp.recipient || sp.inStock || sp.minPrice || sp.maxPrice);

  return (
    <div>
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />

      <div className="border-b border-brand-dark/10 bg-brand-surface">
        <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-brand-dark/55">
            {crumbs.map((c, i) => (
              <span key={c.path} className="flex items-center gap-1">
                {i > 0 ? <ChevronRight className="h-3 w-3" aria-hidden="true" /> : null}
                {i === crumbs.length - 1 ? (
                  <span className="text-brand-dark" aria-current="page">{c.name}</span>
                ) : (
                  <Link href={c.path} className="hover:text-brand-dark hover:underline">{c.name}</Link>
                )}
              </span>
            ))}
          </nav>
          <h1 className="font-heading text-3xl text-brand-dark sm:text-4xl">{productType.name}</h1>
          {productType.description ? <p className="mt-2 max-w-2xl text-sm text-brand-dark/60">{productType.description}</p> : null}
          {chips.length > 0 ? (
            <nav aria-label={chipsLabel} className="mt-5">
              <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-dark/50">{chipsLabel}</p>
              <div className="flex flex-wrap gap-2">
                {chips.map((t) => (
                  <Link key={t.id} href={chipHref(t)} aria-current={t.id === productType.id ? "true" : undefined} className="gf-chip">{t.name}</Link>
                ))}
              </div>
            </nav>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[264px_1fr] lg:gap-8">
          <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start">
            <ShopFilters vendors={vendors} current={current} hrefFor={hrefFor} attributeSections={attributeSections} />
          </aside>

          <div>
            <ShopToolbar total={total} vendors={vendors} current={current} hrefFor={hrefFor} attributeSections={attributeSections} />
            {products.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
                {anyFilter ? (
                  <>
                    No gifts match these filters yet.{" "}
                    <Link href={hrefFor(clearAllPatch(attributeSections))} className="font-medium text-brand-secondary-dark underline">Clear all filters</Link>
                  </>
                ) : (
                  <>
                    Our boutiques are still adding gifts to {productType.name}.{" "}
                    <Link href="/shop" className="font-medium text-brand-secondary-dark underline">Browse other types</Link>
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


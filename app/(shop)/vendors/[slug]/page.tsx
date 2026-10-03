import { defaultShopfrontImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Gift, ShieldCheck, Sparkles, Store, Star, Heart } from "lucide-react";
import { VendorHero, type VendorFeature } from "@/components/shop/VendorHero";
import { VendorFeatureGrid } from "@/components/shop/VendorFeatureGrid";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { ProductCard } from "@/components/shop/ProductCard";
import { Pagination } from "@/components/shop/Pagination";
import { Badge } from "@/components/ui/Badge";
import { getVendorBySlug } from "@/lib/db/vendors";
import { listProducts } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { SEO_LIMITS, truncateText } from "@/lib/seo/pages";
import { baseOpenGraph } from "@/lib/seo/site";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};
  const title = `${vendor.business_name} — GiftPing`;
  const description = truncateText(vendor.short_description || vendor.description, SEO_LIMITS.descriptionIdeal) || `Shop ${vendor.business_name} on GiftPing.`;
  const path = `/vendors/${slug}`;
  const image = vendor.banner_url || vendor.logo_url;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { ...baseOpenGraph(), title, description, url: path, ...(image ? { images: [{ url: image, alt: vendor.business_name }] } : {}) },
  };
}

/**
 * The four "why shop here" claims under a boutique's info block, and the first three of them again as the
 * hero's own quieter icon row. Deliberately generic and truthful for ANY vendor rather than copying one
 * boutique's own marketing language (e.g. "hand-poured") into the shared template — the two claims backed
 * by real per-vendor data (featured status, founding year) use it; the rest are platform-wide promises
 * already true of every approved boutique.
 */
function vendorFeatures(vendor: { is_featured: boolean; year_established: number | null }): VendorFeature[] {
  return [
    { icon: Sparkles, title: "Handpicked Quality", text: "Every product carefully selected" },
    vendor.is_featured
      ? { icon: ShieldCheck, title: "Featured Boutique", text: "Recognised for excellence" }
      : { icon: ShieldCheck, title: "Verified Boutique", text: "Approved seller on GiftPing" },
    { icon: Gift, title: "Perfect for Gifting", text: "Thoughtfully packaged, ready to give" },
    vendor.year_established
      ? { icon: Heart, title: `Since ${vendor.year_established}`, text: "Years of craftsmanship" }
      : { icon: Heart, title: "Crafted with Care", text: "Made to be remembered" },
  ];
}

export default async function VendorStorefrontPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  // None of these three depend on each other — fetch together instead of one-after-another.
  const [vendor, user, theme] = await Promise.all([getVendorBySlug(slug), getServerUser(), getActiveTheme()]);
  if (!vendor) notFound();

  const [{ products, total, totalPages }, wishlistIds] = await Promise.all([
    listProducts({ vendorSlug: slug, page, sort: "popularity" }),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  const features = vendorFeatures(vendor);
  const defaultFront = vendor.banner_url ? null : defaultShopfrontImage(vendor.slug, theme.id);

  return (
    <div>
      <VendorHero
        slug={vendor.slug}
        name={vendor.business_name}
        tagline={vendor.short_description}
        bannerUrl={vendor.banner_url}
        fallbackImage={defaultFront}
        features={features.slice(0, 3)}
      />

      <div className="border-b border-brand-dark/[0.06] bg-brand-accent/40 py-10">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,22rem)_1fr] lg:items-start lg:px-8">
          <div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-dark/10 bg-brand-surface text-brand-secondary-dark">
              <Store className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="mt-4 text-xs uppercase tracking-widest text-brand-dark/50">
              <Link href="/vendors" className="hover:underline">Boutiques</Link> / {vendor.business_name}
            </p>
            <h2 className="mt-1 font-heading text-2xl text-brand-dark">{vendor.business_name}</h2>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {vendor.review_count > 0 ? (
                <Badge variant="gold" className="gap-1">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {vendor.average_rating.toFixed(1)} ({vendor.review_count} reviews)
                </Badge>
              ) : null}
              {vendor.is_featured ? <Badge variant="primary">Featured Boutique</Badge> : null}
            </div>

            {vendor.description ? (
              <p className="mt-4 text-sm leading-relaxed text-brand-dark/70">{vendor.description}</p>
            ) : null}
          </div>

          <VendorFeatureGrid features={features} />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="mb-4 text-sm text-brand-dark/60">
          {total} {total === 1 ? "product" : "products"}
        </p>
        {products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
            This boutique doesn&apos;t have any live products yet.
          </p>
        ) : (
          <ProductGrid>
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />
            ))}
          </ProductGrid>
        )}
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/vendors/${slug}${p > 1 ? `?page=${p}` : ""}`}
        />
      </div>
    </div>
  );
}

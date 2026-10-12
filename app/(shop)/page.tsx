import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DiaryBand } from "@/components/home/DiaryBand";
import { GiftFinderBand } from "@/components/home/GiftFinderBand";
import { DiscoverCards } from "@/components/home/DiscoverCards";
import { HomeHero } from "@/components/home/HomeHero";
import { RelationshipCards } from "@/components/home/RelationshipCards";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { SpotlightSection } from "@/components/motion/SpotlightSection";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { VendorCard } from "@/components/shop/VendorCard";
import { FestivalCountdown } from "@/components/festival/FestivalCountdown";
import { getActiveTheme } from "@/lib/theme/active";
import { HeroBanners } from "@/components/shop/HeroBanners";
import { getFeaturedVendors } from "@/lib/db/vendors";
import { getTrendingProducts } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getHomeBanners } from "@/lib/db/banners";
import { pageMetadata } from "@/lib/seo/site-seo";
import { jsonLdScript, organizationJsonLd, websiteJsonLd } from "@/lib/seo/structured-data";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("home");

export default async function Home({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const user = await getServerUser();
  const accountDeleted = (await searchParams).account === "deleted";
  const [vendors, trending, wishlistIds, banners, theme] = await Promise.all([
    getFeaturedVendors(),
    getTrendingProducts(),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
    getHomeBanners(user ? (user.role === "vendor" || user.role === "admin" ? user.role : "customer") : "guest"),
    getActiveTheme(),
  ]);

  return (
    <>
      {/* Who GiftPing IS (said once, homepage only) — the standard lever for Google to show the real logo/name for this domain, not a guess. */}
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(organizationJsonLd()) }} />
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: jsonLdScript(websiteJsonLd()) }} />

      {accountDeleted ? (
        <p role="status" className="bg-brand-accent px-4 py-3 text-center text-sm text-brand-dark">
          Your account has been deleted and your personal data erased. We&apos;re sorry to see you go — you&apos;re always welcome back.
        </p>
      ) : null}

      <HomeHero />
      <FestivalCountdown themeId={theme.id} />
      <HeroBanners banners={banners} />
      <DiscoverCards />
      <RelationshipCards />
      <GiftFinderBand />

      {trending.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Reveal className="flex items-end justify-between gap-4">
            <SectionHeading align="left" eyebrow="Curated for you" title="Trending in the Mall" subtitle="What people are gifting right now." />
            <Link href="/categories" className="hidden shrink-0 text-sm font-medium text-brand-secondary-dark hover:underline sm:block">View all →</Link>
          </Reveal>
          <SpotlightSection>
            <ProductGrid className="mt-6 lg:grid-cols-4">
              {trending.map((product, i) => (
                <Reveal key={product.id} delay={i * 70}>
                  <ProductCard product={product} isWishlisted={wishlistIds.has(product.id)} />
                </Reveal>
              ))}
            </ProductGrid>
          </SpotlightSection>
        </section>
      ) : null}

      {vendors.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <Reveal>
            <SectionHeading eyebrow="Boutique Avenue" title="Step into a boutique" subtitle="Every boutique is a shop of its own — its own story, its own shelves." />
          </Reveal>
          <div className={`mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${vendors.length === 1 ? "mx-auto max-w-sm sm:grid-cols-1 lg:grid-cols-1" : vendors.length === 2 ? "mx-auto max-w-3xl lg:grid-cols-2" : ""}`}>
            {vendors.map((vendor, i) => (
              <Reveal key={vendor.id} delay={i * 90}>
                <VendorCard vendor={vendor} />
              </Reveal>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Button variant="outline" asChild><Link href="/vendors">View all boutiques <ArrowRight className="h-4 w-4" /></Link></Button>
          </p>
        </section>
      ) : null}

      <DiaryBand />
    </>
  );
}

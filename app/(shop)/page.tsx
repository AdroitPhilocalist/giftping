import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { ProductCard } from "@/components/shop/ProductCard";
import { VendorCard } from "@/components/shop/VendorCard";
import { SearchBar } from "@/components/shop/SearchBar";
import { HeroBanners } from "@/components/shop/HeroBanners";
import { getActiveCategories } from "@/lib/db/categories";
import { getFeaturedVendors } from "@/lib/db/vendors";
import { getTrendingProducts } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getHomeBanners } from "@/lib/db/banners";

export default async function Home({ searchParams }: { searchParams: Promise<{ account?: string }> }) {
  const user = await getServerUser();
  const accountDeleted = (await searchParams).account === "deleted";
  const [categories, vendors, trending, wishlistIds, banners] = await Promise.all([
    getActiveCategories(),
    getFeaturedVendors(),
    getTrendingProducts(),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
    getHomeBanners(user ? (user.role === "vendor" || user.role === "admin" ? user.role : "customer") : "guest"),
  ]);

  return (
    <>
      {accountDeleted ? (
        <p role="status" className="bg-brand-accent px-4 py-3 text-center text-sm text-brand-dark">
          Your account has been deleted and your personal data erased. We&apos;re sorry to see you go — you&apos;re always welcome back.
        </p>
      ) : null}
    <div>
      <HeroBanners banners={banners} />
      <section className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <p className="text-sm font-medium uppercase tracking-widest text-brand-secondary-dark">
          Welcome to GiftPing Mall
        </p>
        <h1 className="mx-auto mt-4 max-w-2xl font-heading text-4xl text-brand-dark sm:text-5xl">
          Where Every Gift Story <span className="text-brand-secondary-dark">Comes Alive</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-dark/60">
          Take a stroll. Explore boutiques. Find the perfect gift for every relationship and every
          moment.
        </p>
        <SearchBar className="mx-auto mt-8 max-w-xl" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {trending.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-brand-secondary-dark">
                Curated for You
              </p>
              <h2 className="mt-1 font-heading text-2xl text-brand-dark sm:text-3xl">
                Discover Meaningful Gifting
              </h2>
            </div>
            <Link href="/categories" className="hidden text-sm font-medium text-brand-primary hover:underline sm:block">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trending.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={wishlistIds.has(product.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {vendors.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <p className="text-xs font-medium uppercase tracking-widest text-brand-secondary-dark">
            Featured Boutiques
          </p>
          <h2 className="mt-1 font-heading text-2xl text-brand-dark sm:text-3xl">Shop by Boutique</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-brand-primary px-6 py-10 text-center text-brand-light sm:px-12">
          <h2 className="font-heading text-2xl sm:text-3xl">Never Miss an Important Moment</h2>
          <p className="mx-auto mt-2 max-w-md text-brand-light/70">
            Keep a diary of the people you love and we&apos;ll remind you before their special days.
          </p>
          <Button variant="gold" className="mt-6" asChild>
            <Link href="/diary">Open My Diary</Link>
          </Button>
        </div>
      </section>
    </div>
    </>
  );
}

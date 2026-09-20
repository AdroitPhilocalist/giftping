import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { VendorLogo } from "@/components/shop/VendorLogo";
import { ProductCard } from "@/components/shop/ProductCard";
import { Pagination } from "@/components/shop/Pagination";
import { Badge } from "@/components/ui/Badge";
import { getVendorBySlug } from "@/lib/db/vendors";
import { listProducts } from "@/lib/db/products";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";

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

  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();

  const user = await getServerUser();
  const [{ products, total, totalPages }, wishlistIds] = await Promise.all([
    listProducts({ vendorSlug: slug, page, sort: "popularity" }),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <div>
      {vendor.banner_url ? (
        <div className="relative aspect-[16/6] max-h-72 w-full overflow-hidden bg-brand-accent sm:aspect-[16/5]">
          <Image src={vendor.banner_url} alt={`${vendor.business_name} banner`} fill priority sizes="100vw" className="object-cover" />
        </div>
      ) : null}
      <div className="border-b border-brand-dark/10 bg-brand-accent/40 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs uppercase tracking-widest text-brand-dark/50">
            <Link href="/vendors" className="hover:underline">
              Boutiques
            </Link>{" "}
            / {vendor.business_name}
          </p>
          <div className="mt-3 flex items-center gap-4">
            <VendorLogo url={vendor.logo_url} name={vendor.business_name} sizeClass="h-16 w-16" iconClass="h-7 w-7" className="bg-brand-surface shadow-sm" />
            <div>
              <h1 className="font-heading text-3xl text-brand-dark">{vendor.business_name}</h1>
              {vendor.short_description ? (
                <p className="mt-1 text-brand-dark/60">{vendor.short_description}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {vendor.review_count > 0 ? (
              <Badge variant="gold" className="gap-1">
                <Star className="h-3.5 w-3.5 fill-current" />
                {vendor.average_rating.toFixed(1)} ({vendor.review_count} reviews)
              </Badge>
            ) : null}
            {vendor.is_featured ? <Badge variant="primary">Featured Boutique</Badge> : null}
          </div>

          {vendor.description ? (
            <p className="mt-4 max-w-2xl text-sm text-brand-dark/70">{vendor.description}</p>
          ) : null}
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
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />
            ))}
          </div>
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

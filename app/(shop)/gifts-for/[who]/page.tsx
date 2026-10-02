import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { HeroBackdrop } from "@/components/art/HeroBackdrop";
import { Robin } from "@/components/art/Robin";
import { Jaali } from "@/components/ornaments/Jaali";
import { Pagination } from "@/components/shop/Pagination";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Button } from "@/components/ui/Button";
import { getServerUser } from "@/lib/auth/session";
import { siteImage } from "@/lib/content/imagery";
import { listProducts } from "@/lib/db/products";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getRelationship } from "@/lib/relationships";
import { getActiveTheme } from "@/lib/theme/active";

export async function generateMetadata({ params }: { params: Promise<{ who: string }> }): Promise<Metadata> {
  const rel = getRelationship((await params).who);
  return rel ? { title: `${rel.title} — GiftPing`, description: rel.line, alternates: { canonical: `/gifts-for/${rel.slug}` } } : {};
}

export default async function GiftsForPage({ params, searchParams }: { params: Promise<{ who: string }>; searchParams: Promise<{ page?: string }> }) {
  const { who } = await params;
  const rel = getRelationship(who);
  if (!rel) notFound();
  const page = Math.max(1, Number((await searchParams).page ?? "1") || 1);

  const user = await getServerUser();
  const [{ products, total, totalPages }, wishlistIds, theme] = await Promise.all([
    listProducts({ ...rel.filter, page, sort: "popularity" }),
    user ? getWishlistProductIds(user.id) : Promise.resolve(new Set<string>()),
    getActiveTheme(),
  ]);
  const portrait = siteImage(rel.imageKey, theme.id);
  const words = rel.title.split(" ");

  return (
    <div>
      <section className="relative isolate overflow-hidden border-b border-brand-dark/[0.06] bg-brand-accent/70">
        {portrait ? <HeroBackdrop image={portrait} priority className="w-[45%] [mask-image:linear-gradient(to_right,transparent_0%,black_55%)]" /> : <Jaali className="opacity-[0.07]" />}
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="rise max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/60">
              <Link href="/" className="hover:text-brand-secondary-dark">Shop by relationship</Link> <span className="text-brand-secondary">›</span> {rel.label}
            </p>
            <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl lg:text-6xl">
              {words.slice(0, -1).join(" ")} <span className="accent-word">{words.at(-1)}</span>
            </h1>
            <p className="mt-4 text-base leading-relaxed text-brand-dark/70">{rel.line}</p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-10 text-center">
            <Robin pose="peeking" className="w-32" />
            <h2 className="font-heading text-2xl text-brand-dark">We&apos;re still curating this shelf</h2>
            <p className="text-brand-dark/65">Nothing is tagged for this yet. Wander the mall — or open your diary and let us suggest something.</p>
            <div className="mt-2 flex flex-wrap justify-center gap-3">
              <Button asChild><Link href="/mall">Explore the Mall</Link></Button>
              <Button variant="outline" asChild><Link href="/diary">Open my diary</Link></Button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-brand-dark/60">{total} {total === 1 ? "gift" : "gifts"} found</p>
            <ProductGrid className="mt-4">
              {products.map((product) => <ProductCard key={product.id} product={product} isWishlisted={wishlistIds.has(product.id)} />)}
            </ProductGrid>
            <Pagination page={page} totalPages={totalPages} buildHref={(p) => `/gifts-for/${rel.slug}${p > 1 ? `?page=${p}` : ""}`} />
          </>
        )}
      </div>
    </div>
  );
}

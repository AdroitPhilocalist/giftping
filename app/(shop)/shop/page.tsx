import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site-seo";
import { ProductTypeCard } from "@/components/shop/ProductTypeCard";
import { getActiveProductTypes } from "@/lib/db/product-types";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("shop");

export default async function ShopByTypePage() {
  const types = await getActiveProductTypes();
  const topLevel = types.filter((t) => !t.parent_id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">What kind of gift?</p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark sm:text-5xl">Shop by <span className="accent-word">type</span>.</h1>
      <p className="mt-3 max-w-xl text-brand-dark/65">Jewellery, candles, chocolates, flowers and more — browse by what a gift actually is, separate from the occasion it&apos;s for.</p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {topLevel.map((t) => (
          <ProductTypeCard key={t.id} productType={t} subcategories={types.filter((c) => c.parent_id === t.id).map((c) => c.name)} />
        ))}
      </div>
    </div>
  );
}

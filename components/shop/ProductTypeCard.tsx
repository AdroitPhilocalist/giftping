import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { TiltCard } from "@/components/motion/TiltCard";

/**
 * A top-level product type (Jewellery, Candles...) on /shop — the plain icon-medallion card style, since
 * product types don't (yet) have delivered artwork the way occasion categories do (see CategoryCard).
 */
export function ProductTypeCard({ productType, subcategories }: { productType: { slug: string; name: string; description?: string | null }; subcategories: string[] }) {
  return (
    <TiltCard className="h-full">
      <Link
        href={`/shop/${productType.slug}`}
        className="group flex h-full flex-col rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-brand-on-primary shadow-card transition-transform duration-500 group-hover:scale-105 group-hover:bg-brand-secondary group-hover:text-brand-on-secondary">
          <Gift className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h2 className="mt-5 font-heading text-2xl text-brand-dark">{productType.name}</h2>
        {productType.description ? <p className="mt-1 line-clamp-2 text-sm text-brand-dark/65">{productType.description}</p> : null}
        {subcategories.length > 0 ? (
          <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-brand-dark/50">
            {subcategories.slice(0, 4).join(" · ")}
            {subcategories.length > 4 ? ` · +${subcategories.length - 4} more` : ""}
          </p>
        ) : null}
        <p className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-secondary-dark">
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </Link>
    </TiltCard>
  );
}

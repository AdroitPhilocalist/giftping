import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { GlowCard } from "@/components/motion/GlowCard";

/**
 * A top-level product type (Jewellery, Candles...) on /shop — the plain icon-medallion card style, since
 * product types don't (yet) have delivered artwork the way occasion categories do (see CategoryCard).
 */
export function ProductTypeCard({ productType, subcategories }: { productType: { slug: string; name: string; description?: string | null }; subcategories: string[] }) {
  return (
    <GlowCard className="h-full">
      <Link
        href={`/shop/${productType.slug}`}
        className="group flex h-full flex-col rounded-card border border-brand-dark/[0.06] bg-brand-surface p-3.5 shadow-card transition-shadow duration-500 hover:shadow-lift sm:p-5"
      >
        <span className="gp-glow-float flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary text-brand-on-primary shadow-card transition-transform duration-500 group-hover:scale-105 group-hover:bg-brand-secondary group-hover:text-brand-on-secondary sm:h-14 sm:w-14">
          <Gift className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h2 className="mt-3 font-heading text-lg leading-snug text-brand-dark sm:mt-5 sm:text-2xl">{productType.name}</h2>
        {productType.description ? <p className="mt-1 hidden line-clamp-2 text-sm text-brand-dark/65 sm:block">{productType.description}</p> : null}
        {subcategories.length > 0 ? (
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-brand-dark/50 sm:mt-3 sm:text-xs">
            {subcategories.slice(0, 4).join(" · ")}
            {subcategories.length > 4 ? ` · +${subcategories.length - 4} more` : ""}
          </p>
        ) : null}
        <p className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-brand-secondary-dark sm:pt-4 sm:text-sm">
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </Link>
    </GlowCard>
  );
}

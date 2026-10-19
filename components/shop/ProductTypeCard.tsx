import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Gift } from "lucide-react";
import { GlowCard } from "@/components/motion/GlowCard";
import { WorldCard } from "@/components/motion/WorldCard";
import type { SiteImage } from "@/lib/content/imagery";

/**
 * A top-level product type (Jewellery, Candles...) on /shop.
 *
 * WITH a delivered photo (`type-<slug>` — i.e. drop `type-jewellery.png` into ui-references/batch-1/ and run
 * `npm run images:sync`, see docs/design/asset-prompts.md) it is a full-bleed "world window"
 * (components/motion/WorldCard.tsx), the same treatment the occasion cards on /categories and the
 * "Handpicked Experiences" cards on /mall already use — those are the same kind of page as this one, a grid of
 * places to browse, so a shopper who understands one understands the other.
 *
 * Two things are deliberately NOT copied from the occasion cards: their `ViewTransition` "door" (an occasion
 * card grows into its own page's banner photo — a product-type page has no such photo to grow into, so the
 * name would dangle with nothing to match), and their drifting `Ambience` (that artwork is keyed by occasion,
 * and a product type isn't one).
 *
 * WITHOUT a photo it stays the icon-medallion "lit glass" card it has always been, so types whose artwork
 * hasn't been generated yet are never broken-looking — just quieter. Nothing has to be done in any particular
 * order.
 */
export function ProductTypeCard({
  productType,
  subcategories,
  image,
}: {
  productType: { slug: string; name: string; description?: string | null };
  subcategories: string[];
  image?: SiteImage | null;
}) {
  const subline =
    subcategories.length > 0
      ? `${subcategories.slice(0, 4).join(" · ")}${subcategories.length > 4 ? ` · +${subcategories.length - 4} more` : ""}`
      : null;

  if (image) {
    return (
      <WorldCard className="h-full">
        <Link
          href={`/shop/${productType.slug}`}
          className="gp-world-frame group relative flex h-full min-h-[11rem] flex-col overflow-hidden rounded-card border border-brand-dark/[0.06] p-3.5 pb-4 text-brand-on-primary shadow-card sm:min-h-[15rem] sm:p-5 sm:pb-6"
        >
          <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="gp-world-photo object-cover" />
          </span>
          <span className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/90 via-brand-primary-dark/40 to-brand-primary-dark/10" aria-hidden="true" />
          <span className="gp-world-sheen" aria-hidden="true" />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-brand-secondary text-brand-on-secondary shadow-card transition-transform duration-500 group-hover:scale-105 sm:h-12 sm:w-12">
            <Gift className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="relative mt-auto pt-3 font-heading text-lg leading-snug sm:pt-0 sm:text-2xl">{productType.name}</h2>
          {productType.description ? (
            <p className="relative mt-1 hidden line-clamp-2 text-sm text-brand-on-primary/75 sm:block">{productType.description}</p>
          ) : null}
          {subline ? (
            <p className="relative mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-brand-on-primary/65 sm:mt-3 sm:text-xs">{subline}</p>
          ) : null}
          <p className="relative mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-secondary sm:mt-3 sm:text-sm">
            Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </p>
        </Link>
      </WorldCard>
    );
  }

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
        {subline ? <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-brand-dark/50 sm:mt-3 sm:text-xs">{subline}</p> : null}
        <p className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-medium text-brand-secondary-dark sm:pt-4 sm:text-sm">
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </Link>
    </GlowCard>
  );
}

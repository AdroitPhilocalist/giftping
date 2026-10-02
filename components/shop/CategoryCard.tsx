import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Briefcase, Cake, Flower2, Gem, Gift, Heart, Watch } from "lucide-react";
import type { SiteImage } from "@/lib/content/imagery";

const ICONS: Record<string, typeof Gift> = { birthday: Cake, anniversary: Heart, wedding: Gem, "corporate-gifting": Briefcase, "for-her": Flower2, "for-him": Watch };

/**
 * A place in the mall. With a "world" photo (the same `world-<slug>` artwork `/mall`'s own "Handpicked
 * Experiences" cards already use — see zoneArt() there), it's a full-bleed photo card with the icon over
 * it, matching that page's look; without one (a category with no delivered artwork yet), it falls back to
 * the plain icon-in-a-medallion card this always used, so a missing image is never a broken-looking card.
 */
export function CategoryCard({ category, image }: { category: { slug: string; name: string; description?: string | null }; image?: SiteImage | null }) {
  const Icon = ICONS[category.slug] ?? Gift;

  if (image) {
    return (
      <Link
        href={`/categories/${category.slug}`}
        className="group relative flex h-full min-h-[15rem] flex-col overflow-hidden rounded-card border border-brand-dark/[0.06] p-5 pb-6 text-brand-on-primary shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
      >
        <Image src={image.src} alt="" fill sizes="(min-width: 1024px) 33vw, 50vw" className="object-cover transition-transform duration-700 ease-out group-hover:scale-105" />
        <span className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/90 via-brand-primary-dark/40 to-brand-primary-dark/10" aria-hidden="true" />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-brand-secondary text-brand-on-secondary shadow-card transition-transform duration-500 group-hover:scale-105">
          <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <h2 className="relative mt-auto font-heading text-2xl">{category.name}</h2>
        {category.description ? <p className="relative mt-1 line-clamp-2 text-sm text-brand-on-primary/75">{category.description}</p> : null}
        <p className="relative mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary">
          Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </Link>
    );
  }

  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex h-full flex-col rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-primary text-brand-on-primary shadow-card transition-transform duration-500 group-hover:scale-105 group-hover:bg-brand-secondary group-hover:text-brand-on-secondary">
        <Icon className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <h2 className="mt-5 font-heading text-2xl text-brand-dark">{category.name}</h2>
      {category.description ? <p className="mt-1 line-clamp-2 text-sm text-brand-dark/65">{category.description}</p> : null}
      <p className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-brand-secondary-dark">
        Explore <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
      </p>
    </Link>
  );
}

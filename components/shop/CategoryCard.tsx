import Link from "next/link";
import { ArrowRight, Briefcase, Cake, Flower2, Gem, Gift, Heart, Watch } from "lucide-react";

const ICONS: Record<string, typeof Gift> = { birthday: Cake, anniversary: Heart, wedding: Gem, "corporate-gifting": Briefcase, "for-her": Flower2, "for-him": Watch };

/** A place in the mall: an icon in a deep-green medallion, its name, and a way in. Colours come from the theme, not from the category row. */
export function CategoryCard({ category }: { category: { slug: string; name: string; description?: string | null } }) {
  const Icon = ICONS[category.slug] ?? Gift;
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

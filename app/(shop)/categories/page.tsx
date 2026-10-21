import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import { pageMetadata } from "@/lib/seo/site-seo";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { getActiveCategories } from "@/lib/db/categories";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("categories");

export default async function CategoriesPage() {
  const [categories, theme] = await Promise.all([getActiveCategories(), getActiveTheme()]);
  const occasions = categories.filter((category) => category.slug !== "corporate-gifting");
  const hasCorporate = categories.some((category) => category.slug === "corporate-gifting");

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Occasions &amp; places</p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark sm:text-5xl">Every occasion has <span className="accent-word">a place</span> here.</h1>
      <p className="mt-3 max-w-xl text-brand-dark/65">Explore GiftPing Mall, one world at a time.</p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {occasions.map((category) => (
          // the same world-<slug> artwork /mall's "Handpicked Experiences" cards already show — see zoneArt() there
          <CategoryCard key={category.id} category={category} image={siteImage(`world-${category.slug}`, theme.id)} />
        ))}
      </div>
      {hasCorporate ? (
        <Link href="/corporate-gifting" className="group mt-10 block overflow-hidden rounded-card border border-brand-primary/20 bg-brand-primary p-5 text-brand-on-primary shadow-card transition-colors hover:bg-brand-primary-dark sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-secondary text-brand-on-secondary">
                <Briefcase className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-brand-secondary">For teams &amp; businesses</p>
                <h2 className="mt-1 font-heading text-2xl">Corporate gifting, handled.</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-brand-on-primary/70">
                  Client gifts, employee milestones and onboarding kits — curated, branded and delivered around your brief.
                </p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-secondary group-hover:text-brand-on-primary">
              Explore corporate gifting <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </div>
        </Link>
      ) : null}
    </div>
  );
}

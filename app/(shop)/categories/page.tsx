import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site-seo";
import { CategoryCard } from "@/components/shop/CategoryCard";
import { getActiveCategories } from "@/lib/db/categories";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

// world-for-her/world-for-him show real, legible third-party brand names and logos (Dior, Chanel) in the photo itself — a genuine trademark /
// false-endorsement risk on a commercial storefront, not just a content-quality nit. Held back here (falls back to the plain icon card, same as a
// category with no artwork at all) until those two are regenerated — see PROGRESS.md's "Next" list, and don't lift this without checking the
// replacement image is actually clean.
const BRAND_VISIBLE_IMAGES = new Set(["for-her", "for-him"]);

export const generateMetadata = (): Promise<Metadata> => pageMetadata("categories");

export default async function CategoriesPage() {
  const [categories, theme] = await Promise.all([getActiveCategories(), getActiveTheme()]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Occasions &amp; places</p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark sm:text-5xl">Every occasion has <span className="accent-word">a place</span> here.</h1>
      <p className="mt-3 max-w-xl text-brand-dark/65">Explore GiftPing Mall, one world at a time.</p>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          // the same world-<slug> artwork /mall's "Handpicked Experiences" cards already show — see zoneArt() there
          <CategoryCard key={category.id} category={category} image={BRAND_VISIBLE_IMAGES.has(category.slug) ? null : siteImage(`world-${category.slug}`, theme.id)} />
        ))}
      </div>
    </div>
  );
}

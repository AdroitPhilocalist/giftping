import { CategoryCard } from "@/components/shop/CategoryCard";
import { getActiveCategories } from "@/lib/db/categories";

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Occasions &amp; places</p>
      <h1 className="mt-2 font-heading text-4xl text-brand-dark sm:text-5xl">Every occasion has <span className="accent-word">a place</span> here.</h1>
      <p className="mt-3 max-w-xl text-brand-dark/65">Explore GiftPing Mall, one world at a time.</p>
      <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}

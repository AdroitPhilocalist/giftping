import { CategoryCard } from "@/components/shop/CategoryCard";
import { getActiveCategories } from "@/lib/db/categories";

export default async function CategoriesPage() {
  const categories = await getActiveCategories();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-brand-dark">All Occasions & Categories</h1>
      <p className="mt-2 text-brand-dark/60">Explore GiftPing Mall, one storefront at a time.</p>
      <div className="mt-8 grid grid-cols-3 gap-6 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>
    </div>
  );
}

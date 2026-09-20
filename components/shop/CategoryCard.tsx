import Link from "next/link";
import { Gift } from "lucide-react";

export function CategoryCard({
  category,
}: {
  category: { name: string; slug: string; theme_color: string | null };
}) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center gap-2 text-center"
    >
      <span
        className="flex h-16 w-16 items-center justify-center rounded-full text-brand-light transition-transform group-hover:scale-105 sm:h-20 sm:w-20"
        style={{ backgroundColor: category.theme_color ?? "var(--gp-primary)" }}
      >
        <Gift className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
      </span>
      <span className="text-xs font-medium text-brand-dark sm:text-sm">{category.name}</span>
    </Link>
  );
}

import Link from "next/link";
import { ProductImage } from "@/components/shop/ProductImage";
import type { CandidatePool } from "@/lib/diary/candidates";
import type { Suggestion } from "@/lib/diary/suggestion-matcher";
import { formatCurrency } from "@/lib/utils/format";

/** Ranked gift ideas with the reason each was picked. Each links to the real product page. */
export function SuggestionList({ suggestions, pool, compact }: { suggestions: Suggestion[]; pool: CandidatePool; compact?: boolean }) {
  const shown = suggestions.filter((s) => pool.byId.has(s.productId));
  if (shown.length === 0) return <p className="text-sm text-brand-dark/50">No matching ideas yet — add an interest or two and check back.</p>;
  return (
    <ul className={compact ? "grid gap-2 sm:grid-cols-3" : "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"}>
      {shown.map((s) => {
        const p = pool.byId.get(s.productId)!;
        return (
          <li key={s.productId}>
            <Link href={`/products/${p.slug}`} className="flex gap-3 rounded-xl border border-brand-dark/10 bg-white p-2.5 transition-shadow hover:shadow-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                <ProductImage src={p.thumbnail} alt={p.name} className="h-full w-full" sizes="56px" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-brand-dark">{p.name}</p>
                <p className="text-xs text-brand-dark/60">{formatCurrency(p.price)}{p.vendorName ? ` · ${p.vendorName}` : ""}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-brand-secondary-dark">{s.reasons[0]}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

import { X } from "lucide-react";
import { FilterDrawer } from "@/components/shop/FilterDrawer";
import { FilterAction } from "@/components/shop/ShopNavigation";
import { FilterSections } from "@/components/shop/ShopFilters";
import { attributeAppliedFilters, clearAllPatch, DEFAULT_SORT, SORT_OPTIONS, appliedFilters, type AttributeFilterSection, type FilterPatch, type FilterState } from "@/lib/shop/filters";
import "./shop.css";

/**
 * The strip above the results: how many gifts, the phone's Filters button, the sort choice, and — when anything is narrowing the results — the applied filters as
 * removable chips with a Clear all. Filter/sort actions are buttons, so their query-string variants never enter the crawlable link graph.
 */
export function ShopToolbar({
  total, vendors, current, hrefFor, hide, attributeSections = [],
}: {
  total: number;
  vendors: { slug: string; business_name: string; logo_url?: string | null }[];
  current: FilterState;
  hrefFor: (patch: FilterPatch) => string;
  hide?: "occasion" | "recipient";
  attributeSections?: AttributeFilterSection[];
}) {
  const applied = appliedFilters(current, vendors, attributeAppliedFilters(attributeSections));
  const sort = current.sort && SORT_OPTIONS.some((o) => o.value === current.sort) ? current.sort : DEFAULT_SORT;
  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <p className="font-heading text-lg italic text-brand-dark/70">{total} {total === 1 ? "gift" : "gifts"} found</p>
        <FilterDrawer count={applied.length} total={total}>
          <FilterSections vendors={vendors} current={current} hrefFor={hrefFor} hide={hide} attributeSections={attributeSections} />
        </FilterDrawer>
        <nav aria-label="Sort" className="-mx-1 flex w-full items-center gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:ml-auto sm:w-auto sm:pb-0 [&::-webkit-scrollbar]:hidden">
          <span className="shrink-0 pr-1 text-[11px] font-medium uppercase tracking-[0.18em] text-brand-dark/50">Sort</span>
          {SORT_OPTIONS.map((o) => (
            <FilterAction key={o.value} href={hrefFor({ sort: o.value === DEFAULT_SORT ? undefined : o.value })} aria-current={sort === o.value ? "true" : undefined} className="gf-sort">{o.label}</FilterAction>
          ))}
        </nav>
      </div>
      {applied.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
          {applied.map((f) => (
            <FilterAction key={f.key} href={hrefFor(f.clear)} aria-label={`Remove filter: ${f.label}`} className="gf-applied">
              {f.label}
              <X className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
            </FilterAction>
          ))}
          <FilterAction href={hrefFor(clearAllPatch(attributeSections))} className="ml-1 text-xs font-medium text-brand-secondary-dark underline-offset-2 hover:underline">Clear all</FilterAction>
        </div>
      ) : null}
    </div>
  );
}

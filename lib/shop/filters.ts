/**
 * Pure logic for the shop filter panel (components/shop/ShopFilters.tsx) — what is currently applied, the price shortcuts, the sort options. No React, tested.
 * The URL is the state, and it is user-controlled: everything here treats values as untrusted text and only ever DESCRIBES them (the page itself re-validates).
 */
import { labelForTag } from "../catalog/tags";

export interface FilterState {
  vendor?: string;
  occasion?: string;
  recipient?: string;
  sort?: string;
  inStock?: string;
  minPrice?: string;
  maxPrice?: string;
}
export type FilterPatch = Partial<Record<keyof FilterState, string | undefined>>;

export const SORT_OPTIONS = [
  { value: "popularity", label: "Popular" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
] as const;

export const DEFAULT_SORT = "popularity";

/** One-tap price bands. `min`/`max` are whole rupees; an open end is simply absent. */
export const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₹500", max: 500 },
  { label: "₹500 – ₹1,000", min: 500, max: 1000 },
  { label: "₹1,000 – ₹2,500", min: 1000, max: 2500 },
  { label: "Over ₹2,500", min: 2500 },
];

const num = (v: string | undefined): number | undefined => {
  if (v === undefined || v.trim() === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** The preset whose band exactly matches the current min/max, if any. */
export function activePricePreset(state: Pick<FilterState, "minPrice" | "maxPrice">): number {
  const min = num(state.minPrice);
  const max = num(state.maxPrice);
  return PRICE_PRESETS.findIndex((p) => p.min === min && p.max === max);
}

const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** "₹500 – ₹1,000", "Under ₹500", "Over ₹2,500"; null when no price filter is applied. */
export function priceLabel(state: Pick<FilterState, "minPrice" | "maxPrice">): string | null {
  const min = num(state.minPrice);
  const max = num(state.maxPrice);
  if (min === undefined && max === undefined) return null;
  if (min === undefined) return `Under ${money(max!)}`;
  if (max === undefined) return `Over ${money(min)}`;
  return `${money(min)} – ${money(max)}`;
}

export interface AppliedFilter {
  key: string;
  label: string;
  /** what to change to take just this one off */
  clear: FilterPatch;
}

/** Everything currently narrowing the results, as removable chips. Sort is not a filter and is not listed. */
export function appliedFilters(state: FilterState, vendors: { slug: string; business_name: string }[]): AppliedFilter[] {
  const out: AppliedFilter[] = [];
  if (state.recipient) out.push({ key: "recipient", label: labelForTag(state.recipient), clear: { recipient: undefined } });
  if (state.occasion) out.push({ key: "occasion", label: labelForTag(state.occasion), clear: { occasion: undefined } });
  if (state.vendor) out.push({ key: "vendor", label: vendors.find((v) => v.slug === state.vendor)?.business_name ?? "Boutique", clear: { vendor: undefined } });
  const price = priceLabel(state);
  if (price) out.push({ key: "price", label: price, clear: { minPrice: undefined, maxPrice: undefined } });
  if (state.inStock === "true") out.push({ key: "inStock", label: "In stock", clear: { inStock: undefined } });
  return out;
}

/** The patch that removes every filter but keeps the chosen sort. */
export const CLEAR_ALL: FilterPatch = { vendor: undefined, occasion: undefined, recipient: undefined, inStock: undefined, minPrice: undefined, maxPrice: undefined };

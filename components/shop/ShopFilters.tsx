import Link from "next/link";
import { OCCASION_TAGS, RECIPIENT_TAGS, labelForTag } from "@/lib/catalog/tags";
import "./shop.css";

export interface FilterState {
  vendor?: string;
  occasion?: string;
  recipient?: string;
  sort?: string;
  inStock?: string;
}
type Patch = Partial<Record<keyof FilterState, string | undefined>>;

const SORTS = [
  { value: "popularity", label: "Popular" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "newest", label: "Newest" },
  { value: "rating", label: "Top rated" },
];

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-heading text-[0.95rem] italic text-brand-dark/80">{title}</p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible [&::-webkit-scrollbar]:hidden">{children}</div>
    </div>
  );
}

/**
 * Filters as tags you tap: every option is a plain link to the same page with one thing changed, so it is server-rendered, works without JavaScript and can be
 * shared. Tapping the active one clears it. On a phone each group scrolls sideways; on a desktop they sit on a paper tag beside the products.
 */
export function ShopFilters({ vendors, current, hrefFor }: { vendors: { slug: string; business_name: string }[]; current: FilterState; hrefFor: (patch: Patch) => string }) {
  const toggle = (key: keyof FilterState, value: string) => hrefFor({ [key]: current[key] === value ? undefined : value });
  return (
    <section aria-label="Filter and sort" className="relative space-y-5 rounded-card border border-brand-secondary/20 bg-brand-surface p-5 pt-6 shadow-card">
      <span className="gift-tag-hole !-top-1.5" aria-hidden="true" />
      <Group title="For">
        {RECIPIENT_TAGS.map((t) => <Link key={t} href={toggle("recipient", t)} aria-current={current.recipient === t ? "true" : undefined} className="pill">{labelForTag(t)}</Link>)}
      </Group>
      <Group title="Occasion">
        {OCCASION_TAGS.map((t) => <Link key={t} href={toggle("occasion", t)} aria-current={current.occasion === t ? "true" : undefined} className="pill">{labelForTag(t)}</Link>)}
      </Group>
      {vendors.length > 0 ? (
        <Group title="Boutique">
          {vendors.slice(0, 12).map((v) => <Link key={v.slug} href={toggle("vendor", v.slug)} aria-current={current.vendor === v.slug ? "true" : undefined} className="pill">{v.business_name}</Link>)}
        </Group>
      ) : null}
      <Group title="Sort">
        {SORTS.map((o) => <Link key={o.value} href={hrefFor({ sort: o.value === "popularity" ? undefined : o.value })} aria-current={(current.sort ?? "popularity") === o.value ? "true" : undefined} className="pill">{o.label}</Link>)}
      </Group>
      <Group title="Availability">
        <Link href={toggle("inStock", "true")} aria-current={current.inStock === "true" ? "true" : undefined} className="pill">In stock only</Link>
      </Group>
    </section>
  );
}

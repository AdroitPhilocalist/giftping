import Link from "next/link";
import { Baby, Briefcase, Cake, Check, ChevronDown, ChevronRight, Flower2, Gem, Gift, Heart, Home as HomeIcon, IndianRupee, Package, SlidersHorizontal, Store, Users, Watch } from "lucide-react";
import { VendorLogo } from "@/components/shop/VendorLogo";
import { OCCASION_TAGS, RECIPIENT_TAGS, labelForTag } from "@/lib/catalog/tags";
import { CLEAR_ALL, PRICE_PRESETS, activePricePreset, appliedFilters, type FilterPatch, type FilterState } from "@/lib/shop/filters";
import { cn } from "@/lib/utils/cn";
import "./shop.css";

export type { FilterState } from "@/lib/shop/filters";

type Vendor = { slug: string; business_name: string; logo_url?: string | null };
type Hide = "occasion" | "recipient" | undefined;

const TAG_ICONS: Record<string, typeof Gift> = {
  "for-her": Flower2, "for-him": Watch, "for-parents": Users, "for-kids": Baby, "for-colleagues": Briefcase,
  birthday: Cake, anniversary: Heart, wedding: Gem, housewarming: HomeIcon, "thank-you": Gift,
};

/** A collapsible section: a small round icon, the title, a dot when something in it is applied, and a chevron. Plain <details> — no JavaScript. */
function Section({ title, icon: Icon, active = false, defaultOpen = true, children }: { title: string; icon: typeof Gift; active?: boolean; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group/sec border-t border-dashed border-brand-secondary/30 py-4 first:border-t-0 first:pt-1">
      <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-lg [&::-webkit-details-marker]:hidden">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark"><Icon className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" /></span>
        <span className="flex-1 font-heading text-[1.02rem] text-brand-dark">{title}</span>
        {active ? <span className="h-1.5 w-1.5 rounded-full bg-brand-secondary" aria-label="has a filter applied" /> : null}
        <ChevronDown className="h-4 w-4 text-brand-dark/40 transition-transform duration-300 group-open/sec:rotate-180" aria-hidden="true" />
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function Chip({ href, selected, icon: Icon, children }: { href: string; selected: boolean; icon?: typeof Gift; children: React.ReactNode }) {
  const Glyph = selected ? Check : Icon;
  return (
    <Link href={href} aria-current={selected ? "true" : undefined} className="gf-chip">
      {Glyph ? <Glyph className="h-3.5 w-3.5" strokeWidth={selected ? 2.4 : 1.7} aria-hidden="true" /> : null}
      {children}
    </Link>
  );
}

/**
 * The filter sections, as plain links to the same page with one thing changed — server-rendered, shareable, works without JavaScript. Tapping the chosen option
 * again clears it. Used inside the desktop panel (`ShopFilters`) and inside the phone's bottom sheet (`FilterDrawer`).
 */
export function FilterSections({ vendors, current, hrefFor, hide }: { vendors: Vendor[]; current: FilterState; hrefFor: (patch: FilterPatch) => string; hide?: Hide }) {
  const toggle = (key: keyof FilterState, value: string) => hrefFor({ [key]: current[key] === value ? undefined : value });
  const preset = activePricePreset(current);
  const customPrice = preset === -1 && Boolean(current.minPrice || current.maxPrice);
  const inStock = current.inStock === "true";
  return (
    <div>
      {/* Inside the Birthday world an "Occasion" group would only repeat the world's own choice, so the group a world already answers is left out. */}
      {hide === "recipient" ? null : (
        <Section title="Who is it for?" icon={Users} active={Boolean(current.recipient)}>
          <div className="flex flex-wrap gap-2">
            {RECIPIENT_TAGS.map((t) => <Chip key={t} href={toggle("recipient", t)} selected={current.recipient === t} icon={TAG_ICONS[t]}>{labelForTag(t)}</Chip>)}
          </div>
        </Section>
      )}
      {hide === "occasion" ? null : (
        <Section title="Occasion" icon={Cake} active={Boolean(current.occasion)}>
          <div className="flex flex-wrap gap-2">
            {OCCASION_TAGS.map((t) => <Chip key={t} href={toggle("occasion", t)} selected={current.occasion === t} icon={TAG_ICONS[t]}>{labelForTag(t)}</Chip>)}
          </div>
        </Section>
      )}
      {vendors.length > 0 ? (
        <Section title="Boutique" icon={Store} active={Boolean(current.vendor)}>
          <ul className="gf-scroll -mx-1 max-h-56 space-y-0.5 overflow-y-auto px-1">
            {vendors.slice(0, 30).map((v) => {
              const on = current.vendor === v.slug;
              return (
                <li key={v.slug}>
                  <Link href={toggle("vendor", v.slug)} aria-current={on ? "true" : undefined} className="gf-row">
                    <span className="gf-radio" aria-hidden="true" />
                    <VendorLogo url={v.logo_url ?? null} name={v.business_name} sizeClass="h-6 w-6" iconClass="h-3 w-3" className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{v.business_name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}
      <Section title="Price" icon={IndianRupee} active={Boolean(current.minPrice || current.maxPrice)}>
        <div className="flex flex-wrap gap-2">
          {PRICE_PRESETS.map((p, i) => (
            <Chip key={p.label} href={hrefFor({ minPrice: preset === i ? undefined : p.min?.toString(), maxPrice: preset === i ? undefined : p.max?.toString() })} selected={preset === i}>{p.label}</Chip>
          ))}
        </div>
        <form method="get" className="mt-3 flex items-center gap-1.5">
          <input type="hidden" name="vendor" value={current.vendor ?? ""} />
          <input type="hidden" name="occasion" value={current.occasion ?? ""} />
          <input type="hidden" name="recipient" value={current.recipient ?? ""} />
          <input type="hidden" name="sort" value={current.sort ?? ""} />
          <input type="hidden" name="inStock" value={current.inStock ?? ""} />
          <label className="gf-money"><span aria-hidden="true">₹</span><input type="number" name="minPrice" min={0} inputMode="numeric" defaultValue={current.minPrice ?? ""} placeholder="Min" aria-label="Minimum price in rupees" /></label>
          <span className="shrink-0 text-brand-dark/35" aria-hidden="true">–</span>
          <label className="gf-money"><span aria-hidden="true">₹</span><input type="number" name="maxPrice" min={0} inputMode="numeric" defaultValue={current.maxPrice ?? ""} placeholder="Max" aria-label="Maximum price in rupees" /></label>
          <button type="submit" aria-label="Apply price range" className={cn("gf-apply", customPrice && "gf-apply--on")}><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </form>
      </Section>
      <div className="border-t border-dashed border-brand-secondary/30 pt-4">
        <Link href={toggle("inStock", "true")} role="switch" aria-checked={inStock} aria-current={inStock ? "true" : undefined} className="gf-switch-row">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark"><Package className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" /></span>
          <span className="flex-1 font-heading text-[1.02rem] text-brand-dark">In stock only</span>
          <span className="gf-switch" aria-hidden="true"><i /></span>
        </Link>
      </div>
    </div>
  );
}

/** The desktop panel: a paper gift tag with a header (how many filters are on, and Clear all) over the sections. */
export function ShopFilters({ vendors, current, hrefFor, hide }: { vendors: Vendor[]; current: FilterState; hrefFor: (patch: FilterPatch) => string; hide?: Hide }) {
  const count = appliedFilters(current, vendors).length;
  return (
    <section aria-label="Filters" className="relative rounded-card border border-brand-secondary/20 bg-brand-surface shadow-card">
      <span className="gift-tag-hole !-top-1.5" aria-hidden="true" />
      <header className="flex items-center justify-between gap-3 border-b border-brand-secondary/20 px-5 pb-3.5 pt-6">
        <h2 className="flex items-center gap-2 font-heading text-xl text-brand-dark">
          <SlidersHorizontal className="h-4.5 w-4.5 text-brand-secondary-dark" strokeWidth={1.7} aria-hidden="true" />
          Filters
          {count > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-secondary px-1.5 font-sans text-[11px] font-semibold text-brand-on-secondary">{count}</span> : null}
        </h2>
        {count > 0 ? <Link href={hrefFor(CLEAR_ALL)} className="text-xs font-medium text-brand-secondary-dark underline-offset-2 hover:underline">Clear all</Link> : null}
      </header>
      <div className="gf-scroll px-5 py-3 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto">
        <FilterSections vendors={vendors} current={current} hrefFor={hrefFor} hide={hide} />
      </div>
    </section>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight, Briefcase, Cake, GraduationCap, Heart, Home as HomeIcon, PartyPopper, Sparkles, Gift as GiftIcon,
} from "lucide-react";
import { NAV_ITEMS, isCurrent } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";
import { LinkPending } from "@/components/motion/LinkPending";

export interface MegaCategory { id: string; name: string; slug: string }
export interface MegaVendor { id: string; business_name: string; slug: string; logo_url: string | null; short_description: string | null }
export interface MegaProductType { id: string; name: string; slug: string }

/** A little icon per occasion, guessed from the slug — the same idea as the homepage's occasion strip, just for whichever categories are actually featured. */
function occasionIcon(slug: string) {
  if (slug.includes("birthday")) return Cake;
  if (slug.includes("anniversary") || slug.includes("love") || slug.includes("valentine")) return Heart;
  if (slug.includes("wedding")) return Sparkles;
  if (slug.includes("housewarming") || slug.includes("home")) return HomeIcon;
  if (slug.includes("graduation")) return GraduationCap;
  if (slug.includes("corporate") || slug.includes("business")) return Briefcase;
  if (slug.includes("festival") || slug.includes("diwali") || slug.includes("celebrat")) return PartyPopper;
  return GiftIcon;
}

/**
 * Desktop navigation, on the floating dark pill. "Occasions" and "Boutiques" open a mega-menu on hover (or focus, for keyboard use) — a curated preview of
 * a few featured categories/vendors, not the full list. Held open across the small gap between the trigger and the panel with a short close delay, so
 * moving the mouse down into it doesn't lose it.
 */
export function NavLinks({ categories, vendors, productTypes }: { categories: MegaCategory[]; vendors: MegaVendor[]; productTypes: MegaProductType[] }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<"occasions" | "boutiques" | "types" | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openNow = (key: "occasions" | "boutiques" | "types") => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(key);
  };
  const closeSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 180);
  };

  return (
    <nav aria-label="Main" className="hidden items-center xl:flex">
      {NAV_ITEMS.map((item, index) => {
        const current = isCurrent(pathname, item.href);
        const mega: "occasions" | "boutiques" | "types" | null =
          item.label === "Occasions" ? "occasions" : item.label === "Boutiques" ? "boutiques" : item.label === "Shop by Type" ? "types" : null;
        const divider = index < NAV_ITEMS.length - 1 ? <span aria-hidden="true" className="mx-0.5 text-brand-on-primary/25">|</span> : null;
        const linkEl = (
          <Link
            href={item.href}
            aria-current={current ? "page" : undefined}
            aria-expanded={mega ? openMenu === mega : undefined}
            className={cn(
              "gp-nav-link relative whitespace-nowrap rounded-full px-2.5 py-2 text-[0.88rem] font-medium tracking-[0.01em] transition-colors duration-300",
              current ? "gp-nav-link--current text-brand-secondary bg-brand-on-primary/10" : "text-brand-on-primary/85 hover:bg-brand-on-primary/10 hover:text-brand-on-primary",
            )}
          >
            {item.label}
            <LinkPending />
          </Link>
        );
        if (!mega) return <span key={item.label} className="flex items-center">{linkEl}{divider}</span>;
        return (
          <span key={item.label} className="flex items-center">
            <div className="relative" onMouseEnter={() => openNow(mega)} onMouseLeave={closeSoon} onFocus={() => openNow(mega)} onBlur={closeSoon}>
              {linkEl}
              {mega === "occasions" ? (
                <MegaPanel open={openMenu === "occasions"} onMouseEnter={() => openNow("occasions")} onMouseLeave={closeSoon}>
                  <OccasionsPanel categories={categories} />
                </MegaPanel>
              ) : mega === "boutiques" ? (
                <MegaPanel open={openMenu === "boutiques"} onMouseEnter={() => openNow("boutiques")} onMouseLeave={closeSoon}>
                  <BoutiquesPanel vendors={vendors} />
                </MegaPanel>
              ) : (
                <MegaPanel open={openMenu === "types"} onMouseEnter={() => openNow("types")} onMouseLeave={closeSoon}>
                  <TypesPanel productTypes={productTypes} />
                </MegaPanel>
              )}
            </div>
            {divider}
          </span>
        );
      })}
    </nav>
  );
}

function MegaPanel({ open, onMouseEnter, onMouseLeave, children }: { open: boolean; onMouseEnter: () => void; onMouseLeave: () => void; children: React.ReactNode }) {
  return (
    <div
      // the x-centering lives entirely in the .gp-mega CSS rule's own `transform` — Tailwind v4's `-translate-x-1/2` would set the separate `translate`
      // property, which composes with (not replaces) a `transform` also on this element and doubles the shift (the same gotcha noted in CLAUDE.md for the
      // robin cursor): pick one mechanism for a given axis, never both.
      className={cn("gp-mega absolute left-1/2 top-full pt-3", !open && "gp-mega--closed")}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden={!open}
    >
      <div className="gp-mega-panel w-[min(30rem,80vw)] rounded-[1.75rem] border border-brand-dark/[0.07] bg-brand-surface p-3 shadow-lift">
        {children}
      </div>
    </div>
  );
}

function OccasionsPanel({ categories }: { categories: MegaCategory[] }) {
  // Corporate gifting has its own top-level destination now; a second door in the occasion menu would
  // split the same audience between a B2B landing page and a product grid.
  const occasions = categories.filter((category) => category.slug !== "corporate-gifting");
  if (occasions.length === 0) {
    return <EmptyPanelLink href="/categories">Browse every occasion →</EmptyPanelLink>;
  }
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5">
        {occasions.slice(0, 6).map((c) => {
          const Icon = occasionIcon(c.slug);
          return (
            <li key={c.id}>
              <Link href={`/categories/${c.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center transition-colors duration-200 hover:bg-brand-accent">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
                  <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
                </span>
                <span className="text-xs font-medium leading-tight text-brand-dark">{c.name}</span>
              </Link>
            </li>
          );
        })}
      </ul>
      <PanelFooterLink href="/categories">See every occasion</PanelFooterLink>
    </>
  );
}

function TypesPanel({ productTypes }: { productTypes: MegaProductType[] }) {
  if (productTypes.length === 0) {
    return <EmptyPanelLink href="/shop">Browse every type →</EmptyPanelLink>;
  }
  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5">
        {productTypes.slice(0, 12).map((t) => (
          <li key={t.id}>
            <Link href={`/shop/${t.slug}`} className="group flex flex-col items-center gap-2 rounded-2xl px-2 py-3.5 text-center transition-colors duration-200 hover:bg-brand-accent">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
                <GiftIcon className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
              </span>
              <span className="text-xs font-medium leading-tight text-brand-dark">{t.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      <PanelFooterLink href="/shop">See every type</PanelFooterLink>
    </>
  );
}

function BoutiquesPanel({ vendors }: { vendors: MegaVendor[] }) {
  if (vendors.length === 0) {
    return <EmptyPanelLink href="/vendors">Browse every boutique →</EmptyPanelLink>;
  }
  return (
    <>
      <ul className="space-y-0.5">
        {vendors.slice(0, 5).map((v) => (
          <li key={v.id}>
            <Link href={`/vendors/${v.slug}`} className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors duration-200 hover:bg-brand-accent">
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-accent text-sm font-semibold text-brand-secondary-dark">
                {v.logo_url ? <Image src={v.logo_url} alt="" fill sizes="40px" className="object-cover" /> : v.business_name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-brand-dark">{v.business_name}</span>
                {v.short_description ? <span className="block truncate text-xs text-brand-dark/55">{v.short_description}</span> : null}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 text-brand-dark/30 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand-secondary-dark" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <PanelFooterLink href="/vendors">See every boutique</PanelFooterLink>
    </>
  );
}

function EmptyPanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center justify-center gap-2 rounded-2xl px-4 py-6 text-sm font-medium text-brand-secondary-dark hover:bg-brand-accent">
      {children}
    </Link>
  );
}

function PanelFooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mt-1 flex items-center justify-center gap-1.5 rounded-2xl border-t border-brand-dark/[0.06] px-4 pb-1 pt-3 text-sm font-medium text-brand-secondary-dark hover:text-brand-secondary">
      {children} <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

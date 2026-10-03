"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import { Briefcase, Cake, ChevronRight, DoorOpen, Flower2, Gem, Gift, Heart, Pause, Play, Store, Watch } from "lucide-react";
import { MallMapArt } from "@/components/art/MallMapArt";
import { Robin } from "@/components/art/Robin";
import { ProductImage } from "@/components/shop/ProductImage";
import type { PlaceSummary } from "@/lib/mall-summaries";
import "../shop/shop.css";
import { IMAGE_POSITIONS, MALL_ZONES, PLAN_POSITIONS, type ZoneIcon } from "@/lib/mall";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<ZoneIcon, typeof Gift> = { door: DoorOpen, cake: Cake, gem: Gem, heart: Heart, store: Store, flower: Flower2, watch: Watch, briefcase: Briefcase, gift: Gift };
const TOUR_STEP_MS = 2600;
const DEFAULT_PREVIEW = "atrium";

/**
 * The interactive floor plan. Numbered markers are real links (keyboard-focusable, announced by screen readers); the list beside the map mirrors them, and hovering
 * or focusing either lights up both. "Take a Tour" walks through the places one by one and stops the moment the visitor touches anything.
 * `image` is the client's illustrated map once it exists; until then the drawn plan is used and both share the same nine places.
 * `previews` maps a place to a picture of its "interior" (the occasion world images); hovering a place cross-fades to it under the map.
 */
export function MallDirectory({ image, previews, summaries }: { image: { src: string; width: number; height: number } | null; previews: Record<string, string>; summaries: Record<string, PlaceSummary> }) {
  const [active, setActive] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const positions = image ? IMAGE_POSITIONS : PLAN_POSITIONS;

  // The robin flies to whichever place was touched last and STAYS there when the pointer moves off (otherwise it would dart back to the entrance every time the
  // mouse crosses a gap between two numbers). It faces the way it is flying. Adjusted during render — React's documented pattern — so no effect sets state.
  const [perch, setPerch] = useState({ id: "entrance", facing: 1 });
  if (active && active !== perch.id) {
    setPerch({ id: active, facing: positions[active].x < positions[perch.id].x ? -1 : 1 });
  }
  const perched = MALL_ZONES.find((z) => z.id === perch.id) ?? MALL_ZONES[0];
  const summary = summaries[perched.id];
  // On a touch screen the first tap on a number shows its card and only a second tap goes in (there is no hover to preview with).
  const tappedOnce = useRef<string | null>(null);
  const enter = (e: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!window.matchMedia("(hover: none)").matches) return;
    if (tappedOnce.current !== id) {
      e.preventDefault();
      tappedOnce.current = id;
      touch(id);
    }
  };

  useEffect(() => {
    if (!touring) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // the tour is a motion feature: for reduced-motion visitors it only offers the manual list
    const timer = setInterval(() => {
      setActive((current) => {
        const at = MALL_ZONES.findIndex((z) => z.id === current);
        return MALL_ZONES[(at + 1) % MALL_ZONES.length].id;
      });
    }, TOUR_STEP_MS);
    return () => clearInterval(timer);
  }, [touring]);

  const touch = (id: string | null) => {
    setTouring(false);
    setActive(id);
  };
  const current = MALL_ZONES.find((z) => z.id === active);

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
      {/* the map */}
      <div className="order-first lg:order-none lg:col-start-2">
        <div className="relative mx-auto w-full max-w-[38rem]">
          <div className={cn("relative", image ? "" : "aspect-[600/640]")}>
            {image ? (
              <Image src={image.src} alt="Illustrated floor plan of the GiftPing mall" width={image.width} height={image.height} priority sizes="(min-width: 1024px) 40vw, 90vw" className="soft-edges h-auto w-full" />
            ) : (
              <MallMapArt activeId={active} className="absolute inset-0 h-full w-full" />
            )}
            {/* the robin, flying to whichever place you touch. The outer box travels (left/top, eased); the flip and the hop are on inner elements. */}
            <div aria-hidden="true" className="gp-map-robin" style={{ left: `${positions[perch.id].x}%`, top: `${positions[perch.id].y}%` }}>
              <div style={{ transform: `scaleX(${perch.facing})` }}>
                <div key={perch.id} className="gp-map-robin-hop"><Robin pose="flying-gift" title="" /></div>
              </div>
            </div>
            {MALL_ZONES.map((z) => {
              const p = positions[z.id];
              const on = active === z.id;
              return (
                <Link
                  key={z.id}
                  href={z.href}
                  aria-label={`${z.n}. ${z.title} — ${z.sub}`}
                  onMouseEnter={() => touch(z.id)}
                  onMouseLeave={() => touch(null)}
                  onFocus={() => touch(z.id)}
                  onBlur={() => touch(null)}
                  onClick={(e) => enter(e, z.id)}
                  style={{ left: `${p.x}%`, top: `${p.y}%` }}
                  className={cn(
                    "absolute z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-brand-on-primary shadow-lift ring-2 ring-brand-surface transition-all duration-300 focus-visible:outline-none focus-visible:ring-brand-secondary sm:h-10 sm:w-10",
                    on ? "scale-125 bg-brand-secondary text-brand-on-secondary" : "hover:scale-110",
                  )}
                >
                  {on ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-brand-secondary/50" aria-hidden="true" /> : null}
                  {z.n}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => { setTouring((t) => !t); if (!touring) setActive(MALL_ZONES[0].id); }}
              className="inline-flex items-center gap-2 rounded-button bg-brand-primary px-5 py-2.5 text-sm font-medium text-brand-on-primary shadow-card transition-all duration-300 hover:-translate-y-px hover:bg-brand-primary-dark"
              aria-pressed={touring}
            >
              {touring ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />} {touring ? "Pause the tour" : "Take a Tour"}
            </button>
          </div>
          {Object.keys(previews).length > 0 ? (
            <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-accent shadow-card" aria-hidden="true">
              {Object.entries(previews).map(([id, src]) => (
                <Image key={id} src={src} alt="" fill sizes="(min-width: 1024px) 34vw, 90vw" className={cn("object-cover transition-opacity duration-700", (active ?? DEFAULT_PREVIEW) === id ? "opacity-100" : "opacity-0")} />
              ))}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-primary-dark/80 to-transparent px-4 pb-3 pt-10">
                <p className="font-heading text-lg text-white">{(current ?? MALL_ZONES.find((z) => z.id === DEFAULT_PREVIEW))?.title}</p> {/* theme-safe: text on a photo scrim */}
              </div>
            </div>
          ) : null}
          <div className="mt-4 min-h-[9.5rem] rounded-card border border-brand-dark/[0.06] bg-brand-surface p-4 shadow-card" aria-live="polite">
            <div key={perched.id} className="rise">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading text-lg leading-tight text-brand-dark">{perched.n}. {perched.title}</p>
                  <p className="mt-0.5 text-sm text-brand-dark/65">{perched.sub}</p>
                </div>
                {summary ? <span className="shrink-0 rounded-full bg-brand-accent px-3 py-1 text-xs font-medium text-brand-secondary-dark">{summary.label}</span> : null}
              </div>
              <p className="mt-2 text-[13px] italic text-brand-dark/60">“{perched.guide}”</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                {summary && summary.items.length > 0 ? (
                  <ul className="flex gap-2">
                    {summary.items.map((item) => (
                      <li key={item.id}>
                        <Link href={item.href} title={item.name} aria-label={item.name} className="block h-12 w-12 overflow-hidden rounded-xl ring-1 ring-brand-dark/10 transition-transform duration-300 hover:-translate-y-0.5">
                          <ProductImage src={item.image} alt="" sizes="48px" className="h-full w-full" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : <span />}
                <Link href={perched.href} className="inline-flex items-center gap-1 rounded-button bg-brand-secondary px-4 py-2 text-sm font-medium text-brand-on-secondary shadow-card transition-transform duration-300 hover:-translate-y-px">
                  {perched.id === "entrance" ? "Back to the front door" : "Step inside"} <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* the directory list */}
      <div className="lg:col-start-3 lg:row-start-1">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/60">Directory <span className="text-brand-secondary">—</span></p>
        <ul className="divide-y divide-brand-dark/[0.07] overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-surface shadow-card">
          {MALL_ZONES.map((z) => {
            const Icon = ICONS[z.icon];
            const on = active === z.id;
            return (
              <li key={z.id}>
                <Link
                  href={z.href}
                  onMouseEnter={() => touch(z.id)}
                  onMouseLeave={() => touch(null)}
                  onFocus={() => touch(z.id)}
                  onBlur={() => touch(null)}
                  className={cn("group flex items-center gap-3 px-4 py-3 transition-colors duration-300", on ? "bg-brand-accent" : "hover:bg-brand-accent/50")}
                >
                  <Icon className="h-6 w-6 shrink-0 text-brand-primary" strokeWidth={1.4} aria-hidden="true" />
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors", on ? "bg-brand-secondary text-brand-on-secondary" : "bg-brand-accent text-brand-secondary-dark")}>{z.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-brand-dark">{z.title}</span>
                    <span className="block truncate text-xs text-brand-dark/60">{z.sub}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-brand-dark/40 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

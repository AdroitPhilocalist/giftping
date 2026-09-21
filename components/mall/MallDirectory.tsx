"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Briefcase, Cake, ChevronRight, DoorOpen, Flower2, Gem, Gift, Heart, Pause, Play, Store, Watch } from "lucide-react";
import { MallMapArt } from "@/components/art/MallMapArt";
import { IMAGE_POSITIONS, MALL_ZONES, PLAN_POSITIONS, type ZoneIcon } from "@/lib/mall";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<ZoneIcon, typeof Gift> = { door: DoorOpen, cake: Cake, gem: Gem, heart: Heart, store: Store, flower: Flower2, watch: Watch, briefcase: Briefcase, gift: Gift };
const TOUR_STEP_MS = 2600;

/**
 * The interactive floor plan. Numbered markers are real links (keyboard-focusable, announced by screen readers); the list beside the map mirrors them, and hovering
 * or focusing either lights up both. "Take a Tour" walks through the places one by one and stops the moment the visitor touches anything.
 * `image` is the client's illustrated map once it exists; until then the drawn plan is used and both share the same nine places.
 */
export function MallDirectory({ image }: { image: { src: string; width: number; height: number } | null }) {
  const [active, setActive] = useState<string | null>(null);
  const [touring, setTouring] = useState(false);
  const positions = image ? IMAGE_POSITIONS : PLAN_POSITIONS;

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
    <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-6">
      {/* the map */}
      <div className="order-first lg:order-none lg:col-start-2">
        <div className="relative mx-auto w-full max-w-[34rem]">
          <div className={cn("relative", image ? "" : "aspect-[600/640]")}>
            {image ? (
              <Image src={image.src} alt="Illustrated floor plan of the GiftPing mall" width={image.width} height={image.height} priority sizes="(min-width: 1024px) 40vw, 90vw" className="h-auto w-full" />
            ) : (
              <MallMapArt activeId={active} className="absolute inset-0 h-full w-full" />
            )}
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
          <p className="mt-3 min-h-10 text-center text-sm text-brand-dark/65" aria-live="polite">
            {current ? <><strong className="font-heading text-base text-brand-dark">{current.title}</strong> — {current.sub}</> : "Hover a number, or take the tour."}
          </p>
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

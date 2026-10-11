"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { MouseEvent } from "react";
import { Briefcase, Cake, ChevronRight, DoorOpen, Flower2, Gem, Gift, Heart, Pause, Play, Store, Watch } from "lucide-react";
import { MallMapArt } from "@/components/art/MallMapArt";
import { Robin } from "@/components/art/Robin";
import type { PlaceSummary } from "@/lib/mall-summaries";
import "../shop/shop.css";
import { IMAGE_POSITIONS, MALL_ZONES, PLAN_POSITIONS, type ZoneIcon } from "@/lib/mall";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<ZoneIcon, typeof Gift> = { door: DoorOpen, cake: Cake, gem: Gem, heart: Heart, store: Store, flower: Flower2, watch: Watch, briefcase: Briefcase, gift: Gift };
const TOUR_STEP_MS = 2600;

/**
 * Where the floating preview card sits relative to its marker, so it never spills off the map's edge: flips to
 * whichever side of the marker has room, purely from the marker's own (x, y) percentage — no measuring needed.
 * A marker in the top half gets a card BELOW it (nothing to spill into above); bottom half gets one ABOVE.
 * A marker near the left/right edge gets the card anchored to that same edge (extending inward) instead of
 * centered, so it can't run off the side; a marker near the middle gets it centered.
 */
function overlayTransform(x: number, y: number): string {
  const tx = x < 35 ? "0%" : x > 65 ? "-100%" : "-50%";
  const ty = y < 50 ? "0%" : "-100%";
  const gx = x < 35 ? "14px" : x > 65 ? "-14px" : "0px";
  const gy = y < 50 ? "14px" : "-14px";
  return `translate(calc(${tx} + ${gx}), calc(${ty} + ${gy}))`;
}

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
  const summary = current ? summaries[current.id] : undefined;
  const currentPos = current ? positions[current.id] : null;

  return (
    // The map and the directory sit side by side (top-aligned, not centered — a previous pass fixed the
    // directory being merely vertically centered against the map, which could leave it oddly offset from
    // whatever you were actually hovering). The "what is this place" preview no longer has a column of its
    // own at all: a static block — wherever it sat — needed a scroll past everything above it on any ordinary
    // laptop height, and worse on phones. It's now a small floating card that appears ON the map itself,
    // anchored right next to whichever marker you're on (overlayTransform flips it above/below and left/right
    // so it never runs off the map's edge), the same positioning trick the robin already uses. It shows only
    // while something is actually active — unlike the old card, it isn't meant to linger once you look away.
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-6">
      {/* the map */}
      <div className="lg:col-start-2">
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
            {/* the floating preview: photo + name for whichever place is active, right on the map next to its
                marker — a single card that re-anchors itself rather than nine pre-placed ones, since the content
                always belongs to "whatever's active right now", not to a fixed marker. Hovering the card itself
                also counts as staying on it (same as a marker), so moving from the dot onto the card to click
                through doesn't make it vanish out from under the pointer. */}
            {current && currentPos && previews[current.id] ? (
              <Link
                href={current.href}
                aria-label={`${current.n}. ${current.title} — Step inside`}
                onMouseEnter={() => touch(current.id)}
                onMouseLeave={() => touch(null)}
                style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%`, transform: overlayTransform(currentPos.x, currentPos.y) }}
                className="absolute z-30 block w-44 overflow-hidden rounded-card border border-brand-dark/10 bg-brand-surface shadow-lift sm:w-56"
              >
                <span className="relative block aspect-[4/3] w-full">
                  <Image src={previews[current.id]} alt="" fill sizes="224px" className="object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-brand-primary-dark/85 via-brand-primary-dark/10 to-transparent" aria-hidden="true" />
                  {summary ? <span className="absolute left-2 top-2 rounded-full bg-brand-surface/90 px-2 py-0.5 text-[10px] font-medium text-brand-secondary-dark">{summary.label}</span> : null}
                  <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5">
                    <span className="font-heading text-sm leading-tight text-white">{current.n}. {current.title}</span> {/* theme-safe: text on a photo scrim */}
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-secondary text-brand-on-secondary"><ChevronRight className="h-4 w-4" aria-hidden="true" /></span>
                  </span>
                </span>
              </Link>
            ) : null}
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
        </div>
      </div>

      {/* the directory list */}
      <div className="lg:col-start-3">
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

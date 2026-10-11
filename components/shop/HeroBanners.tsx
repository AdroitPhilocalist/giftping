"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { isInternalLink } from "@/lib/content/banners";
import type { HomeBanner } from "@/lib/db/banners";
import { cn } from "@/lib/utils/cn";

const ROTATE_MS = 6000;

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * The homepage carousel. Slides are stacked and cross-fade; with one banner there are no controls. Autoplay pauses on hover/focus and is switched off
 * entirely for visitors who ask for reduced motion. Hidden slides are removed from tab order and the accessibility tree.
 */
export function HeroBanners({ banners }: { banners: HomeBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(REDUCED_MOTION).matches, () => false);
  const count = banners.length;

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(timer);
  }, [count, paused, reduceMotion]);

  if (count === 0) return null;
  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured offers"
      className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-brand-accent sm:aspect-[16/7]">
        {banners.map((banner, i) => {
          const active = i === index;
          const external = banner.ctaUrl ? !isInternalLink(banner.ctaUrl) : false;
          const content = (
            <>
              <Image src={banner.imageUrl} alt={banner.alt} fill priority={i === 0} sizes="(min-width: 1280px) 1216px, 100vw" className="object-cover" />
              {banner.headline || banner.subheading || banner.ctaText ? (
                <div className="absolute inset-0 flex items-end bg-gradient-to-r from-black/65 via-black/25 to-transparent p-6 sm:items-center sm:p-12">
                  <div className="max-w-md text-white">
                    {banner.headline ? <h2 className="font-heading text-2xl leading-tight sm:text-4xl">{banner.headline}</h2> : null}
                    {banner.subheading ? <p className="mt-2 text-sm text-white/85 sm:text-base">{banner.subheading}</p> : null}
                    {banner.ctaUrl && banner.ctaText ? (
                      <span className="mt-4 inline-block rounded-full bg-brand-secondary px-5 py-2 text-sm font-medium text-brand-dark">{banner.ctaText}</span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          );
          const shared = {
            className: cn("absolute inset-0 block transition-opacity duration-700 motion-reduce:transition-none", active ? "opacity-100" : "pointer-events-none opacity-0"),
            "aria-hidden": !active,
            tabIndex: active ? 0 : -1,
          } as const;
          return banner.ctaUrl ? (
            external ? (
              <a key={banner.id} href={banner.ctaUrl} target="_blank" rel="noopener noreferrer" {...shared}>{content}</a>
            ) : (
              <Link key={banner.id} href={banner.ctaUrl} {...shared}>{content}</Link>
            )
          ) : (
            <div key={banner.id} className={shared.className} aria-hidden={shared["aria-hidden"]}>{content}</div>
          );
        })}

        {count > 1 ? (
          <>
            {/* Grouped prev/next pill in the top-right corner — clear of the text block, which is always left-aligned
                and can run from top to bottom of the banner (items-end on phones, items-center from sm up). A pair of
                thin circles at the vertical mid-point used to land right on top of the headline/subheading on the left
                half of every slide. One solid card, same shadow-card + near-opaque surface the gallery's own arrows use. */}
            <div className="absolute right-3 top-3 hidden items-center gap-0.5 rounded-full bg-brand-surface/95 p-1 shadow-card backdrop-blur-sm sm:flex sm:right-4 sm:top-4">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous offer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-all duration-300 hover:scale-105 hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="h-5 w-px bg-brand-dark/15" aria-hidden="true" />
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next offer"
                className="flex h-9 w-9 items-center justify-center rounded-full text-brand-dark transition-all duration-300 hover:scale-105 hover:bg-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-secondary"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Choose an offer">
              {banners.map((banner, i) => (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Offer ${i + 1} of ${count}`}
                  onClick={() => setIndex(i)}
                  className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-brand-surface" : "w-2 bg-brand-surface/55 hover:bg-brand-surface/80")}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
      <p className="sr-only" aria-live={paused ? "polite" : "off"}>Offer {index + 1} of {count}</p>
    </section>
  );
}

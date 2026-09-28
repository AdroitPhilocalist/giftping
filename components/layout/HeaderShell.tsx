"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The header: `position: fixed`, not `sticky` — deliberately. A sticky element still reserves its own box in normal document flow at rest, so the page's
 * real content (the homepage hero photo included) would only ever start right where the header ends, never extend up behind/underneath it — there would be
 * nothing but the plain page background behind a translucent header, no matter how its colours are tuned (found the hard way: no amount of retuning the
 * glass tint fixed "I can see the page background behind the navbar, not the hero photo" complaints, because the photo genuinely never reached there).
 * `fixed` removes it from flow entirely, so it floats OVER whatever the page actually renders at the top — `app/layout.tsx`'s `<main>` carries matching
 * padding-top so ordinary pages look exactly as before, and `HomeHero.tsx` cancels that same padding with a negative margin specifically so its photo
 * bleeds up behind the header instead of being pushed down by it. Condenses into a smaller inset floating pill once the page has scrolled a little (smaller
 * logo, tighter padding, a closer shadow) — styling in globals.css (`.gp-header[data-condensed]`). Two thresholds (condense past 48px, relax under 12px) so
 * it never flickers at the boundary, and the change is written straight to the element, so scrolling never re-renders React.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let condensed = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const next = condensed ? y > 12 : y > 48;
      if (next !== condensed) {
        condensed = next;
        el.dataset.condensed = String(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <header ref={ref} data-condensed="false" className="gp-header fixed inset-x-0 top-0 z-40">
      {children}
    </header>
  );
}

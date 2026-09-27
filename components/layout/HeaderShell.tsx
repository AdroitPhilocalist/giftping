"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The sticky header: a permanently-floating capsule (never a full-width bar — see globals.css `.gp-header-inner`), the same on every page whether it sits
 * over a hero photo or the plain cream page underneath. At the top of a page it sits a little roomier and lower; once the page has scrolled a little it
 * condenses (smaller logo, tighter padding, a closer shadow) so it takes less of the screen — styling in globals.css (`.gp-header[data-condensed]`). Two
 * thresholds (condense past 48px, relax under 12px) so it never flickers at the boundary, and the change is written straight to the element, so scrolling
 * never re-renders React.
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
    <header ref={ref} data-condensed="false" className="gp-header sticky top-0 z-40">
      {children}
    </header>
  );
}

"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * The sticky header. At the top of a page it is full size; once the page has scrolled a little it condenses (smaller logo, tighter padding, a soft shadow) so
 * it takes less of the screen — the styling is in globals.css (`.gp-header[data-condensed]`). Two thresholds (condense past 48px, relax under 12px) so it
 * never flickers at the boundary, and the change is written straight to the element, so scrolling never re-renders React.
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
    <header ref={ref} data-condensed="false" className="gp-header sticky top-0 z-40 border-b border-brand-dark/[0.06] bg-brand-light/90 backdrop-blur-md">
      {children}
    </header>
  );
}

"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

/** How small a page may be drawn before it stops shrinking (below this the extras are already gone and the window is simply very short). */
const MIN_SCALE = 0.6;
/** Below these scales the page lets go of its extras first (`dy-drop-1`, then `dy-drop-2`), so what stays is drawn as large as it can be. */
const DROP_1 = 0.9;
const DROP_2 = 0.78;

/**
 * Makes a page fit the window instead of scrolling: it measures what the page wants to be and, if that is taller than the page is, draws the whole page a
 * little smaller — like zooming a real page out — and drops the least important extras first. A page that already fits is left exactly as it is.
 * (A scaled box laid out at 1/scale of the size, so text reflows wider as it shrinks rather than just being squashed.)
 */
export function FitPage({ children }: { children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const o = outer.current;
    const i = inner.current;
    if (!o || !i) return;

    /** the scale at which what the page holds is exactly as tall as the page, given the extras currently shown */
    const solve = () => {
      const have = o.clientHeight;
      let z = 1;
      for (let n = 0; n < 6; n++) {
        i.style.setProperty("--z", String(z));
        i.style.height = "auto"; // let the content take the height it wants, at this scale's width
        const need = i.offsetHeight;
        i.style.height = "";
        const next = Math.min(1, Math.max(MIN_SCALE, need > 0 ? have / need : 1));
        if (Math.abs(next - z) < 0.004) break;
        z = next;
      }
      i.style.setProperty("--z", String(z));
      return z;
    };

    const fit = () => {
      if (o.clientHeight === 0) return;
      o.dataset.fit = "0";
      let z = solve();
      if (z < DROP_1) {
        o.dataset.fit = "1";
        z = solve();
        if (z < DROP_2) {
          o.dataset.fit = "2";
          z = solve();
        }
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(o);
    // handwriting and the body font arrive a moment after the first paint and change how much room text takes
    let live = true;
    void document.fonts?.ready.then(() => { if (live) fit(); });
    return () => { live = false; ro.disconnect(); };
  }, []);

  return (
    <div ref={outer} className="dy-fit" data-fit="0">
      <div ref={inner} className="dy-fit-inner">{children}</div>
    </div>
  );
}

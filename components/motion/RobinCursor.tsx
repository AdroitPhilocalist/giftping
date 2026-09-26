"use client";

import { useEffect, useRef } from "react";

// fields where the system cursor (I-beam / arrow) is the better cue: the robin fades out and the native cursor takes over
const NATIVE_CURSOR_SELECTOR = 'input:not([type="checkbox"], [type="radio"], [type="button"], [type="submit"], [type="reset"], [type="range"], [type="file"], [type="color"]), textarea, select, [contenteditable="true"]';
const INTERACTIVE_SELECTOR = 'a, button, [role="button"], summary, input, select, textarea, label, [tabindex]:not([tabindex="-1"])';

/**
 * A small robin that takes over the mouse pointer on desktop — the client asked for this by name. It
 * shows the client's own robin-perched artwork when it exists (passed in as `markSrc` from a server
 * component that already resolved the active theme) and a simplified code-drawn one until then, matching
 * the same "real art if delivered, drawn fallback otherwise" pattern as every other Robin appearance.
 *
 * Deliberately conservative about when it activates, because a custom cursor is a real usability trade:
 *   - never on touch/coarse pointers (there's no mouse to replace) — checked via matchMedia, not device
 *     sniffing, so it also behaves correctly if the same laptop is used with a touchscreen and a mouse.
 *   - never when the visitor asked for reduced motion — a *following* cursor is inherently motion.
 *   - over text fields and dropdowns the robin fades out and the native cursor takes over, so it's always clear where
 *     typing will land.
 *   - it never sits ON the pointer (it hid small icon buttons): it rides just below and to the right of a small dot that marks the real pointer,
 *     and over anything clickable it shrinks and the dot grows into a ring — the "this is clickable" cue a normal hand cursor would give.
 *   - the visitor can switch it off (footer) — remembered in localStorage.
 *   - it's one mounted component in app/layout.tsx; removing that one line turns it off everywhere.
 */
export const ROBIN_CURSOR_KEY = "gp-robin-cursor";
export const ROBIN_CURSOR_EVENT = "gp:robin-cursor";
/** The visitor's own switch (footer): "off" keeps the ordinary pointer everywhere. */
export const robinCursorWanted = () => {
  try {
    return window.localStorage.getItem(ROBIN_CURSOR_KEY) !== "off";
  } catch {
    return true;
  }
};

export function RobinCursor({ markSrc }: { markSrc: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    const el = ref.current;
    const dot = dotRef.current;
    if (!el || !dot) return;
    const root = document.documentElement;
    const apply = () => root.classList.toggle("gp-robin-cursor", robinCursorWanted());
    apply();
    window.addEventListener(ROBIN_CURSOR_EVENT, apply);

    let lastX = -1;
    function onMove(e: MouseEvent) {
      if (!el || !dot) return;
      // face the direction of travel — a tiny bit of personality, not just a dot that follows.
      if (lastX >= 0 && Math.abs(e.clientX - lastX) > 2) {
        el.style.setProperty("--gp-cursor-flip", e.clientX < lastX ? "-1" : "1");
      }
      lastX = e.clientX;
      // The robin keeps company just below and to the right of the real pointer instead of sitting on it, so it never hides what is being pointed at;
      // a small copper dot marks the exact spot.
      el.style.transform = `translate(${e.clientX + 10}px, ${e.clientY + 10}px)`;
      dot.style.transform = `translate(${e.clientX - 4}px, ${e.clientY - 4}px)`;
      const source = e.target as Element | null;
      const interactive = source?.closest(INTERACTIVE_SELECTOR) ? "true" : "false";
      const hidden = source?.closest(NATIVE_CURSOR_SELECTOR) ? "true" : "false";
      el.dataset.interactive = interactive;
      el.dataset.hidden = hidden;
      dot.dataset.interactive = interactive;
      dot.dataset.hidden = hidden;
    }
    function onDown() {
      if (el) el.dataset.pressed = "true";
    }
    function onUp() {
      if (el) el.dataset.pressed = "false";
    }
    function onLeaveWindow() {
      if (el) el.style.transform = "translate(-100px, -100px)";
      if (dot) dot.style.transform = "translate(-100px, -100px)";
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeaveWindow);
    return () => {
      root.classList.remove("gp-robin-cursor");
      window.removeEventListener(ROBIN_CURSOR_EVENT, apply);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeaveWindow);
    };
  }, []);

  return (
    <>
    <div ref={dotRef} className="gp-robin-dot" aria-hidden="true" />
    <div ref={ref} className="gp-robin-cursor-mark" aria-hidden="true">
      <div className="gp-robin-cursor-inner">
      {markSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- an imperatively-transformed cursor mark; next/image's wrapper div would fight the transform
        <img src={markSrc} alt="" width={34} height={34} className="h-full w-full object-contain drop-shadow-[0_3px_6px_rgb(28_25_22_/_0.25)]" />
      ) : (
        <svg viewBox="0 0 34 34" className="h-full w-full drop-shadow-[0_3px_6px_rgb(28_25_22_/_0.25)]">
          <ellipse cx="17" cy="20" rx="10" ry="8.5" fill="var(--gp-copper-dark)" />
          <path d="M8 20c0-4.5 2.5-8 7.5-8.5 5 .3 8.5 3.6 8.5 8 0 4.5-3.5 7.5-8 7.5S8 24 8 20z" fill="var(--gp-peach)" />
          <path d="M6 21c1-3.5 3.5-5.5 7-5 2.5.6 4 3 3.5 6.5-.5 3.5-2.5 6-5.5 7-3-1-5.5-4.5-5-8.5z" fill="var(--gp-copper)" />
          <circle cx="10.5" cy="14.5" r="7" fill="var(--gp-copper-dark)" />
          <circle cx="9" cy="13" r="1.1" fill="var(--gp-ink)" />
          <path d="M2 14.5l-3.2 1.1 3.2 1.1z" fill="var(--gp-ink)" opacity="0.85" transform="translate(4 0)" />
        </svg>
      )}
      </div>
    </div>
    </>
  );
}

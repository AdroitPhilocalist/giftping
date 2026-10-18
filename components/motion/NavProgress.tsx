"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "loading" | "done";

/**
 * The 2px gold bar across the very top of the page, the moment a same-origin `<Link>` is clicked.
 *
 * The App Router exposes no navigation events, so the start is inferred from a document-level click and the finish
 * from the route actually changing (pathname or query string). It is deliberately the LAST line of feedback, not the
 * first: the route skeletons (`app/**\/loading.tsx`) paint instantly, and `LinkPending` dots sit on the nav itself.
 * This bar is the site-wide "yes, something is happening" for every link we did NOT hand-instrument — cards, the
 * footer, the account menu, the basket — and it only appears if the hop takes a moment, so a fast/prefetched
 * navigation never flashes it.
 *
 * Rendered once, from the root layout (wrapped in `<Suspense>` because it reads `useSearchParams`).
 */
export function NavProgress() {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");
  const armed = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Start: any plain left-click on a same-origin link that actually leads somewhere else.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      // Already here (Next treats it as a no-op) — never start a bar that would not finish.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      armed.current = true;
      setPhase("loading");
      // Nothing may leave the bar stuck (e.g. a link whose click is intercepted and prevented later): give up.
      timers.current.push(setTimeout(() => { armed.current = false; setPhase("idle"); }, 12000));
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
  }, []);

  // Finish: the route changed. Quick snap to full, then fade.
  useEffect(() => {
    if (!armed.current) return;
    armed.current = false;
    clearTimers();
    setPhase("done");
    timers.current.push(setTimeout(() => setPhase("idle"), 450));
  }, [pathname, query]);

  return (
    <div className="gp-progress" data-phase={phase} aria-hidden="true">
      <span className="gp-progress-bar" />
    </div>
  );
}

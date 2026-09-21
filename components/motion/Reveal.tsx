"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * Fades and lifts its children in as they scroll into view — the site's one scroll entrance.
 *
 * Content is VISIBLE by default (server-rendered, no JS needed, never flashes). Only once mounted, and only if the element sits BELOW the fold, does it
 * prepare the hidden state and wait to be scrolled to. So the first screen is never held back by hydration, crawlers and screen readers always see everything,
 * and visitors who prefer reduced motion get no animation at all.
 */
export function Reveal({ children, delay = 0, className, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "article" }) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.96) return; // already on screen: leave it alone

    el.classList.add("reveal");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // next frame, so the hidden state has been painted and the transition actually runs
          requestAnimationFrame(() => { el.dataset.revealed = "true"; });
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -5% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag ref={ref as never} className={className} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </Tag>
  );
}

"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface ContentsItem {
  id: string;
  heading: string;
}

/**
 * The clause index: a sticky rail beside the paper on wide screens, a collapsible list above it on small ones, with the clause
 * you're currently reading marked as you scroll. A long instrument without an index is a document you can only read top-to-bottom.
 *
 * The active clause is worked out from real scroll position rather than IntersectionObserver: the rule is simply "the last clause
 * whose heading has passed under the site header", which is what a reader would say if you asked them where they are.
 */
export function InstrumentContents({ items, className }: { items: ContentsItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const ids = items.map((item) => item.id);
    let frame = 0;

    const read = () => {
      frame = 0;
      let current = ids[0] ?? "";
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 160) current = id;
      }
      setActive((previous) => (previous === current ? previous : current));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };

    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [items]);

  const number = (i: number) => String(i + 1).padStart(2, "0");

  return (
    <div className={cn("deed-noprint", className)}>
      {/* small screens: a folded index above the sheet */}
      <details className="group border border-brand-dark/15 bg-brand-surface px-5 py-4 xl:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-brand-dark [&::-webkit-details-marker]:hidden">
          <span className="flex items-baseline gap-3">
            Contents
            <span className="text-[10px] font-normal uppercase tracking-[0.2em] text-brand-dark/55">{items.length} clauses</span>
          </span>
          <ChevronDown className="h-4 w-4 text-brand-secondary transition-transform duration-300 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <ol className="mt-4 space-y-1 border-t border-brand-dark/10 pt-3">
          {items.map((item, i) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(event) => {
                  const details = event.currentTarget.closest("details");
                  if (details) details.open = false;
                }}
                className="flex gap-3 rounded-button px-2 py-1.5 text-sm text-brand-dark/70 hover:bg-brand-accent/50 hover:text-brand-dark"
              >
                <span className="font-heading text-xs tabular-nums text-brand-dark/55">{number(i)}</span>
                {item.heading}
              </a>
            </li>
          ))}
        </ol>
      </details>

      {/* wide screens: the rail, with the reader's position marked */}
      <nav aria-label="Contents" className="hidden xl:sticky xl:top-28 xl:block">
        <p className="flex items-baseline justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.28em] text-brand-dark/65">
          Contents
          <span className="tabular-nums tracking-[0.12em]">{items.length} clauses</span>
        </p>
        <ol className="mt-4">
          {items.map((item, i) => {
            const current = active === item.id;
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? "location" : undefined}
                  className={cn(
                    "flex gap-3 border-l-2 py-1.5 pl-3 text-sm leading-snug transition-colors",
                    current
                      ? "border-brand-secondary text-brand-dark"
                      : "border-brand-dark/10 text-brand-dark/65 hover:border-brand-secondary/50 hover:text-brand-dark",
                  )}
                >
                  <span className={cn("pt-0.5 font-heading text-xs tabular-nums", current ? "text-brand-secondary-dark" : "text-brand-dark/50")}>
                    {number(i)}
                  </span>
                  <span>{item.heading}</span>
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}

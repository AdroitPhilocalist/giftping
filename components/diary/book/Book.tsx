import Link from "next/link";
import type { ReactNode } from "react";
import { Robin } from "@/components/art/Robin";
import { cn } from "@/lib/utils/cn";

export type DiaryTabKey = "home" | "people" | "year" | "review";

const TABS: { key: DiaryTabKey; href: string; label: string; tone: string }[] = [
  { key: "home", href: "/diary", label: "Diary", tone: "var(--dy-apricot)" },
  { key: "people", href: "/diary/people", label: "People", tone: "var(--dy-sage)" },
  { key: "year", href: "/diary/year", label: "Year", tone: "var(--dy-mustard)" },
  { key: "review", href: "/diary/review", label: "My year", tone: "var(--dy-blush)" },
];

/** Index tabs: sticking out of the book's edge on wide screens (like the month tabs in the reference), a row of chips above it on small ones. */
export function DiaryTabs({ current }: { current?: DiaryTabKey }) {
  return (
    <nav aria-label="Diary sections" className="dy-tabs">
      {TABS.map((t) => (
        <Link key={t.key} href={t.href} className="dy-tab" style={{ "--tab": t.tone } as React.CSSProperties} aria-current={t.key === current ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The open diary: two pages side by side from 1024px up (a leather cover, paper edges, the fold in the middle), one after the other below that.
 * `current` lights the matching index tab; the robin perches on the top corner (a drawn fallback until the illustration exists).
 */
export function Book({ left, right, current, robin = true, className, leftLabel, rightLabel }: { left: ReactNode; right: ReactNode; current?: DiaryTabKey; robin?: boolean; className?: string; leftLabel?: string; rightLabel?: string }) {
  return (
    <div className={cn("relative mx-auto max-w-[78rem]", robin && "xl:pt-14", className)}>
      <DiaryTabs current={current} />
      <div className="dy-book">
        {robin ? (
          <div className="pointer-events-none absolute -top-[4.9rem] right-4 z-10 hidden w-[7.6rem] xl:right-10 xl:block" aria-hidden="true">
            <div className="dy-bob" style={{ "--bob-rot": "-2deg" } as React.CSSProperties}><Robin pose="perched" title="" /></div>
          </div>
        ) : null}
        <div className="dy-spread">
          <section className="dy-page dy-page--left" aria-label={leftLabel}>{left}</section>
          <section className="dy-page dy-page--right" aria-label={rightLabel}>{right}</section>
        </div>
      </div>
    </div>
  );
}

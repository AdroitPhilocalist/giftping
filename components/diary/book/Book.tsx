import Link from "next/link";
import type { ReactNode } from "react";
import { Robin } from "@/components/art/Robin";
import { cn } from "@/lib/utils/cn";
import { TAB_META, tabHref, type DiaryTabKey } from "../flip/tabs";

export type { DiaryTabKey };

/** Index tabs: sticking out of the book's edge on wide screens (like the month tabs in the reference), a row of chips above it on small ones. Each opens that section of the diary book. */
export function DiaryTabs({ current }: { current?: DiaryTabKey }) {
  return (
    <nav aria-label="Diary sections" className="dy-tabs">
      {(Object.keys(TAB_META) as DiaryTabKey[]).map((k) => (
        <Link key={k} href={tabHref(k)} className="dy-tab" style={{ "--tab": TAB_META[k].tone } as React.CSSProperties} aria-current={k === current ? "page" : undefined}>
          {TAB_META[k].label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * The open diary: two pages side by side from 1024px up (a leather cover, paper edges, the fold in the middle), one after the other below that.
 * `current` lights the matching index tab; the robin perches on the top corner (a drawn fallback until the illustration exists).
 */
export function Book({ left, right, current, robin = true, className, leftLabel, rightLabel, fit = false }: { left: ReactNode; right: ReactNode; current?: DiaryTabKey; robin?: boolean; className?: string; leftLabel?: string; rightLabel?: string; fit?: boolean }) {
  return (
    <div className={cn("relative mx-auto max-w-[78rem]", robin && "xl:pt-9", className)}>
      <DiaryTabs current={current} />
      <div className={cn("dy-book", fit && "dy-book--fit")}>
        {robin ? (
          <div className="pointer-events-none absolute -top-[3.7rem] right-4 z-10 hidden w-[6.2rem] xl:right-10 xl:block" aria-hidden="true">
            <div className="dy-bob" style={{ "--bob-rot": "-2deg" } as React.CSSProperties}><Robin pose="perched" title="" /></div>
          </div>
        ) : null}
        <div className="dy-spread">
          <section className="dy-page dy-page--left" aria-label={leftLabel}><div className="dy-page-scroll" tabIndex={fit ? 0 : undefined}>{left}</div></section>
          <section className="dy-page dy-page--right" aria-label={rightLabel}><div className="dy-page-scroll" tabIndex={fit ? 0 : undefined}>{right}</div></section>
        </div>
      </div>
    </div>
  );
}

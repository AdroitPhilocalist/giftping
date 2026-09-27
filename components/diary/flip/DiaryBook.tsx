"use client";

import { RotateCcw } from "lucide-react";
import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode,
} from "react";
import { Robin } from "@/components/art/Robin";
import { cn } from "@/lib/utils/cn";
import { FitPage } from "./FitPage";
import { TAB_META, type DiaryTabKey } from "./tabs";

export type { DiaryTabKey };

export interface SpreadDef {
  id: string;
  tab: DiaryTabKey;
  /** its name, for screen readers: "This month" */
  label: string;
  left: ReactNode;
  right: ReactNode;
}

interface BookApi {
  /** turn to the spread with this id */
  goTo: (id: string) => void;
}
const BookContext = createContext<BookApi | null>(null);
/** For anything inside a page that should turn the book (a "See more →" link). Null outside the book. */
export const useDiaryBook = () => useContext(BookContext);

const WIDE = "(min-width: 1280px) and (min-height: 720px)";
const subscribeNever = () => () => {};
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const subscribeReduced = (cb: () => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

interface PageDef {
  key: string;
  side: "left" | "right";
  node: ReactNode;
  no: number;
  label: string;
}
interface Turn {
  from: number;
  to: number;
  dir: 1 | -1;
}

const TURN_MS = 1000;

/**
 * The diary as a real book. On a wide screen it is an open two-page spread that fits the window; turning a page swings a two-sided leaf over the spine, so
 * the page you turn to is revealed on its back. On a phone or a short screen it shows one page at a time and the same leaf turns it. Pages are given in
 * spreads (left + right). Everything that turns it is part of the book itself: the section tabs on its edge, "turn the page" written in the bottom corner of a
 * page (with the corner curling up when you reach for it), the arrow keys, a swipe, and the "see more" links written on the pages. Nothing sits under the book.
 * Where you are is kept in the address (?p=…) so a reload or a link comes back to the same page.
 */
export function DiaryBook({ spreads, initialId, robin = true }: { spreads: SpreadDef[]; initialId?: string; robin?: boolean }) {
  const wide = useSyncExternalStore(subscribeWide, () => window.matchMedia(WIDE).matches, () => true);
  // false while the server-rendered markup is on screen: it can't know the window size, so the book stays hidden until it does (no layout jump)
  const ready = useSyncExternalStore(subscribeNever, () => true, () => false);
  const reduced = useSyncExternalStore(subscribeReduced, () => window.matchMedia("(prefers-reduced-motion: reduce)").matches, () => false);

  const pages: PageDef[] = useMemo(
    () => spreads.flatMap((s, i) => [
      { key: `${s.id}:l`, side: "left" as const, node: s.left, no: i * 2 + 1, label: `${s.label}, left page` },
      { key: `${s.id}:r`, side: "right" as const, node: s.right, no: i * 2 + 2, label: `${s.label}, right page` },
    ]),
    [spreads],
  );
  const [pos, setPos] = useState(() => Math.max(0, spreads.findIndex((s) => s.id === initialId)) * 2);
  const [turn, setTurn] = useState<Turn | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const cur = wide ? pos - (pos % 2) : pos;
  const last = pages.length - 1;
  const spreadIndex = Math.floor(cur / 2);
  const step = wide ? 2 : 1;
  const canPrev = cur > 0;
  const canNext = cur + step <= last;

  const finish = useCallback((t: Turn) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setPos(t.to);
    setTurn(null);
  }, []);

  const goToPos = useCallback(
    (raw: number) => {
      const target = wide ? raw - (raw % 2) : raw;
      if (turn || target === cur || target < 0 || target > last) return;
      const t: Turn = { from: cur, to: target, dir: target > cur ? 1 : -1 };
      if (reduced) return setPos(target);
      setTurn(t);
      timer.current = setTimeout(() => finish(t), TURN_MS + 250); // a safety net if the animation event never arrives
    },
    [wide, turn, cur, last, reduced, finish],
  );
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const goTo = useCallback((id: string) => {
    const i = spreads.findIndex((s) => s.id === id);
    if (i >= 0) goToPos(i * 2);
  }, [spreads, goToPos]);
  const api = useMemo<BookApi>(() => ({ goTo }), [goTo]);

  // keep the place in the address, so a reload (or coming back from a person's page) opens the same spread
  useEffect(() => {
    const url = new URL(window.location.href);
    if (spreadIndex === 0) url.searchParams.delete("p");
    else url.searchParams.set("p", spreads[spreadIndex]?.id ?? "");
    window.history.replaceState(window.history.state, "", url);
  }, [spreadIndex, spreads]);

  // arrow keys, unless the reader is typing or a dialog is open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (el && (el.closest("input, textarea, select, [contenteditable='true']") || document.querySelector("[role='dialog']"))) return;
      if (e.key === "ArrowRight" && canNext) goToPos(cur + step);
      else if (e.key === "ArrowLeft" && canPrev) goToPos(cur - step);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canNext, canPrev, cur, step, goToPos]);

  // which pages are where
  let staticLeft: PageDef | null = null;
  let staticRight: PageDef | null = null;
  let front: PageDef | null = null;
  let back: PageDef | null = null;
  if (wide) {
    if (!turn) {
      staticLeft = pages[cur];
      staticRight = pages[cur + 1];
    } else if (turn.dir === 1) {
      staticLeft = pages[turn.from];
      staticRight = pages[turn.to + 1];
      front = pages[turn.from + 1];
      back = pages[turn.to];
    } else {
      staticLeft = pages[turn.to];
      staticRight = pages[turn.from + 1];
      front = pages[turn.from];
      back = pages[turn.to + 1];
    }
  } else if (!turn) {
    staticRight = pages[cur];
  } else if (turn.dir === 1) {
    staticRight = pages[turn.to];
    front = pages[turn.from];
  } else {
    staticRight = pages[turn.from];
    front = pages[turn.to];
  }

  const progress = spreads.length > 1 ? spreadIndex / (spreads.length - 1) : 0;
  const style = { "--stack-l": `${3 + Math.round(progress * 10)}px`, "--stack-r": `${3 + Math.round((1 - progress) * 10)}px` } as CSSProperties;
  const activeTab = spreads[spreadIndex]?.tab;
  const tabs = (Object.keys(TAB_META) as DiaryTabKey[]).filter((k) => spreads.some((s) => s.tab === k));

  const shell = (page: PageDef | null, opts: { ears?: boolean; under?: boolean } = {}) =>
    page ? (
      <PageShell
        key={page.key}
        page={page}
        modifier={wide}
        ears={opts.ears ?? false}
        under={opts.under ?? false}
        onPrev={canPrev && !turn ? () => goToPos(cur - step) : undefined}
        onNext={canNext && !turn ? () => goToPos(cur + step) : undefined}
        onRestart={!canNext && canPrev && !turn ? () => goToPos(0) : undefined}
        invite={spreadIndex === 0}
      />
    ) : null;

  return (
    <BookContext.Provider value={api}>
      <div className="relative mx-auto max-w-[78rem] xl:pt-10">
        <nav aria-label="Diary sections" className="dy-tabs">
          {tabs.map((k) => (
            <button key={k} type="button" className="dy-tab" style={{ "--tab": TAB_META[k].tone } as CSSProperties} aria-current={k === activeTab ? "page" : undefined} onClick={() => { const i = spreads.findIndex((s) => s.tab === k); if (i >= 0) goToPos(i * 2); }}>
              {TAB_META[k].label}
            </button>
          ))}
        </nav>

        <div className={cn("dy-book dy-book--fit dy-book--flip", turn && "is-turning")} style={style} data-ready={ready ? "" : undefined}>
          {robin ? (
            <div className="pointer-events-none absolute -top-[2.9rem] right-6 z-10 hidden w-[5.2rem] xl:block" aria-hidden="true">
              <div className="dy-bob" style={{ "--bob-rot": "-2deg" } as CSSProperties}><Robin pose="perched" title="" /></div>
            </div>
          ) : null}
          <div
            className={cn("dy-spread dy-stage", turn && "is-turning")}
            data-mode={wide ? "spread" : "single"}
            onPointerDown={(e) => { swipe.current = e.pointerType === "mouse" ? null : { x: e.clientX, y: e.clientY }; }}
            onPointerUp={(e) => {
              const s = swipe.current;
              swipe.current = null;
              if (!s) return;
              const dx = e.clientX - s.x;
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s.y) * 1.5) {
                if (dx < 0 && canNext) goToPos(cur + step);
                else if (dx > 0 && canPrev) goToPos(cur - step);
              }
            }}
          >
            {wide ? (
              <>
                {shell(staticLeft, { ears: true, under: turn?.dir === -1 })}
                {shell(staticRight, { ears: true, under: turn?.dir === 1 })}
              </>
            ) : (
              shell(staticRight, { ears: true, under: Boolean(turn) })
            )}
            {turn && front ? (
              <div className={cn("dy-leaf", turn.dir === 1 ? "dy-leaf--fwd" : "dy-leaf--back")} onAnimationEnd={(e) => { if (e.target === e.currentTarget) finish(turn); }}>
                <div className="dy-leaf-face dy-leaf-face--front">
                  <PageShell page={front} modifier={wide} />
                  <span className="dy-shade" aria-hidden="true" />
                </div>
                <div className="dy-leaf-face dy-leaf-face--back">
                  {back ? <PageShell page={back} modifier={wide} /> : <div className="dy-page" />}
                  <span className="dy-shade" aria-hidden="true" />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <p className="sr-only" aria-live="polite">{spreads[spreadIndex]?.label}, {wide ? `pages ${cur + 1} and ${cur + 2}` : `page ${cur + 1}`} of {pages.length}</p>
      </div>
    </BookContext.Provider>
  );
}

function PageShell({ page, modifier, ears = false, under = false, onPrev, onNext, onRestart, invite = false }: { page: PageDef; modifier: boolean; ears?: boolean; under?: boolean; onPrev?: () => void; onNext?: () => void; onRestart?: () => void; invite?: boolean }) {
  const isLeft = page.side === "left";
  // a two-page spread puts "back" in the left page's corner and "next" in the right page's; a single page carries both
  const showPrev = ears && onPrev && (!modifier || isLeft);
  const showNext = ears && (onNext || onRestart) && (!modifier || !isLeft);
  return (
    <section className={cn("dy-page", modifier && (isLeft ? "dy-page--left" : "dy-page--right"))} aria-label={page.label}>
      <div className="dy-page-scroll">{modifier ? <FitPage>{page.node}</FitPage> : page.node}</div>
      <span className="dy-turn-fade" aria-hidden="true" />
      <span className="dy-pageno" aria-hidden="true">{page.no}</span>
      {showPrev ? (
        <button type="button" className="dy-turn dy-turn--prev" onClick={onPrev}>
          <TurnCurl />
          <TurnArrow dir="prev" />
          <span>Back</span>
        </button>
      ) : null}
      {showNext && onNext ? (
        <button type="button" className={cn("dy-turn dy-turn--next", invite && "dy-turn--invite")} onClick={onNext}>
          <span>{invite ? "Turn the page" : "Next page"}</span>
          <TurnArrow dir="next" />
          <TurnCurl />
        </button>
      ) : null}
      {showNext && !onNext && onRestart ? (
        <button type="button" className="dy-turn dy-turn--next" onClick={onRestart}>
          <span>Back to the front</span>
          <RotateCcw className="h-[1.1rem] w-[1.1rem]" strokeWidth={2} aria-hidden="true" />
          <TurnCurl />
        </button>
      ) : null}
      {under ? <span className="dy-under-shade" style={{ "--from": isLeft ? "100%" : "0%" } as CSSProperties} aria-hidden="true" /> : null}
    </section>
  );
}

/** The corner of a page, folded up a little — it lifts more when you reach for it. (Two triangles: the paper folded over, and what it uncovers.) */
function TurnCurl() {
  return (
    <span className="dy-curl" aria-hidden="true">
      <b />
      <i />
    </span>
  );
}

/** A hand-drawn arrow, the kind you would scribble in a margin. */
function TurnArrow({ dir }: { dir: "next" | "prev" }) {
  return (
    <svg className={cn("dy-turn-arrow", dir === "prev" && "dy-turn-arrow--prev")} viewBox="0 0 48 22" aria-hidden="true" focusable="false">
      <path d="M2 14c6-8 13 3 22-2 6-3 10-3 17-1" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      <path d="M35 4c4 2 8 5 11 8-4 2-8 5-10 8" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

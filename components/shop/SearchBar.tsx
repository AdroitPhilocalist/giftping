"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, Search, Store } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductImage";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/format";
import { EMPTY_SUGGESTIONS, highlightParts, normaliseSuggestQuery, type SuggestResult } from "@/lib/search/suggest";

type Option = { key: string; href: string; kind: "product" | "category" | "vendor" | "all" };

const DEBOUNCE_MS = 180;

function Highlight({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((p, i) =>
        p.match ? <strong key={i} className="font-semibold text-brand-primary">{p.text}</strong> : <span key={i}>{p.text}</span>,
      )}
    </>
  );
}

/**
 * The site search box. It is a plain GET form to /search first — with JavaScript off, or if the suggestion request
 * fails, pressing Enter still searches. On top of that it suggests products, categories and boutiques as you type
 * (debounced, stale requests cancelled, arrow-key/Enter/Escape navigation, combobox semantics for screen readers).
 */
export function SearchBar({ defaultValue, className }: { defaultValue?: string; className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<SuggestResult>(EMPTY_SUGGESTIONS);
  /** the (normalised) query `result` belongs to; null until the first answer arrives */
  const [answeredFor, setAnsweredFor] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLFormElement>(null);
  const cache = useRef(new Map<string, SuggestResult>());

  const query = normaliseSuggestQuery(value);

  // Fetch as the user types. The effect's cleanup cancels the timer and the in-flight request, so an old answer can
  // never overwrite a newer one.
  useEffect(() => {
    if (!query || !open) return; // nothing to fetch until the box is in use (a pre-filled box on /search shouldn't call the API on load)
    const cached = cache.current.get(query);
    if (cached) {
      setResult(cached);
      setAnsweredFor(query);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!res.ok) return; // throttled or failed: just show no suggestions; Enter still searches
        const data = (await res.json()) as SuggestResult;
        cache.current.set(query, data);
        setResult(data);
        setAnsweredFor(query);
      } catch {
        /* aborted, or offline — nothing to show */
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  const fresh = query !== null && answeredFor === query; // is what's on screen an answer to what's in the box?
  const shown = fresh ? result : EMPTY_SUGGESTIONS;
  const hasAny = shown.products.length + shown.categories.length + shown.vendors.length > 0;

  const options = useMemo<Option[]>(() => {
    if (!query || !fresh) return [];
    const list: Option[] = [
      ...shown.products.map((p) => ({ key: `p:${p.slug}`, href: `/products/${p.slug}`, kind: "product" as const })),
      ...shown.categories.map((c) => ({ key: `c:${c.slug}`, href: `/categories/${c.slug}`, kind: "category" as const })),
      ...shown.vendors.map((v) => ({ key: `v:${v.slug}`, href: `/vendors/${v.slug}`, kind: "vendor" as const })),
    ];
    list.push({ key: "all", href: `/search?q=${encodeURIComponent(query)}`, kind: "all" });
    return list;
  }, [query, fresh, shown]);

  const expanded = open && query !== null && fresh;
  const optionId = (key: string) => `${listId}-${key.replace(/[^a-z0-9]/gi, "-")}`;

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setActive(-1);
      router.push(href);
    },
    [router],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault(); // keep the text — a type="search" input would otherwise also clear itself
        setOpen(false);
        setActive(-1);
      }
      return;
    }
    if (e.key === "ArrowDown" && !open && query) {
      e.preventDefault(); // reopen after Escape
      setOpen(true);
      return;
    }
    if (!expanded || options.length === 0) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      // cycle through the options and the "nothing highlighted" state (-1, i.e. the input itself): n + 1 stops
      const stops = options.length + 1;
      setActive((a) => ((a + 1 + step + stops) % stops) - 1);
      return;
    }
    if (e.key === "Enter" && active >= 0 && options[active]) {
      e.preventDefault();
      go(options[active].href);
    }
  }

  let row = 0; // running index so each rendered row knows its place in `options`
  const renderRow = (o: Option, content: React.ReactNode) => {
    const i = row++;
    const isActive = i === active;
    return (
      <li
        key={o.key}
        id={optionId(o.key)}
        role="option"
        aria-selected={isActive}
        // mousedown (not click) so the input never loses focus — and with it the open list — before we navigate
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => go(o.href)}
        onMouseMove={() => setActive(i)}
        className={cn("flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-brand-dark", isActive ? "bg-brand-accent/70" : "hover:bg-brand-accent/40")}
      >
        {content}
      </li>
    );
  };

  const groupLabel = (text: string) => <li role="presentation" className="px-3 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-brand-dark/45">{text}</li>;

  return (
    <form
      ref={wrapRef}
      action="/search"
      method="get"
      role="search"
      className={cn("relative", className)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-dark/40" />
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        autoComplete="off"
        role="combobox"
        aria-label="Search for gifts, occasions, people"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && active >= 0 && options[active] ? optionId(options[active].key) : undefined}
        placeholder="Search for gifts, occasions, people..."
        className="w-full rounded-button border border-brand-dark/10 bg-brand-light/70 py-3.5 pl-11 pr-4 text-sm text-brand-dark placeholder:text-brand-dark/45 transition-colors focus:border-brand-secondary focus:bg-brand-surface focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
      />

      <div className="sr-only" role="status" aria-live="polite">
        {expanded ? (hasAny ? `${options.length - 1} suggestions available, use the arrow keys to browse` : "No suggestions") : ""}
      </div>

      {expanded ? (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(28rem,70vh)] overflow-y-auto rounded-card border border-brand-dark/10 bg-brand-surface py-1 text-left shadow-lift"
        >
          {shown.products.length > 0 ? groupLabel("Gifts") : null}
          {shown.products.map((p) => {
            const o = options.find((x) => x.key === `p:${p.slug}`)!;
            return renderRow(
              o,
              <>
                <ProductImage src={p.image} alt={p.name} sizes="40px" className="h-10 w-10 shrink-0 rounded-md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate"><Highlight text={p.name} query={query ?? ""} /></span>
                  {p.vendor ? <span className="block truncate text-xs text-brand-dark/50">{p.vendor}</span> : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-brand-dark/70">{formatCurrency(p.price)}</span>
              </>,
            );
          })}
          {shown.categories.length > 0 ? groupLabel("Categories") : null}
          {shown.categories.map((c) =>
            renderRow(
              options.find((x) => x.key === `c:${c.slug}`)!,
              <>
                <LayoutGrid className="h-4 w-4 shrink-0 text-brand-secondary" aria-hidden />
                <span className="truncate"><Highlight text={c.name} query={query ?? ""} /></span>
              </>,
            ),
          )}
          {shown.vendors.length > 0 ? groupLabel("Boutiques") : null}
          {shown.vendors.map((v) =>
            renderRow(
              options.find((x) => x.key === `v:${v.slug}`)!,
              <>
                <Store className="h-4 w-4 shrink-0 text-brand-secondary" aria-hidden />
                <span className="truncate"><Highlight text={v.name} query={query ?? ""} /></span>
              </>,
            ),
          )}
          {!hasAny ? <li role="presentation" className="px-3 py-3 text-sm text-brand-dark/60">Nothing matches &ldquo;{query}&rdquo; yet.</li> : null}
          {renderRow(
            options[options.length - 1],
            <>
              <Search className="h-4 w-4 shrink-0 text-brand-dark/50" aria-hidden />
              <span className="truncate font-medium">See all results for &ldquo;{query}&rdquo;</span>
            </>,
          )}
        </ul>
      ) : null}
    </form>
  );
}

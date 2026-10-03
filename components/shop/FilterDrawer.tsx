"use client";

import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlidersHorizontal, X } from "lucide-react";

/**
 * Phone version of the filter panel: a "Filters" button that opens a bottom sheet holding the very same sections (server-rendered and passed in as `children`).
 * Each option is still a link, so choosing one reloads the results behind the sheet while it stays open — you can combine several, then "Show N gifts".
 * Below `lg` only; the desktop panel is a fixed column beside the products.
 */
export function FilterDrawer({ count, total, children }: { count: number; total: number; children: ReactNode }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="inline-flex items-center gap-2 rounded-full border border-brand-dark/15 bg-brand-surface px-4 py-2 text-sm font-medium text-brand-dark shadow-card transition-colors hover:border-brand-secondary lg:hidden">
          <SlidersHorizontal className="h-4 w-4 text-brand-secondary-dark" strokeWidth={1.8} aria-hidden="true" />
          Filters
          {count > 0 ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-secondary px-1.5 text-[11px] font-semibold text-brand-on-secondary">{count}</span> : null}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-primary-dark/55 backdrop-blur-[2px]" />
        <Dialog.Content aria-describedby={undefined} className="gf-sheet fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-[1.75rem] bg-brand-surface shadow-lift focus:outline-none">
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-brand-dark/15" aria-hidden="true" />
          <header className="flex items-center justify-between px-5 pb-3 pt-3">
            <Dialog.Title className="font-heading text-xl text-brand-dark">Filters</Dialog.Title>
            <Dialog.Close aria-label="Close filters" className="rounded-full p-2 text-brand-dark/60 hover:bg-brand-dark/5"><X className="h-5 w-5" /></Dialog.Close>
          </header>
          <div className="gf-scroll flex-1 overflow-y-auto border-t border-brand-secondary/15 px-5 py-3">{children}</div>
          <footer className="border-t border-brand-secondary/15 bg-brand-surface px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <Dialog.Close className="w-full rounded-full bg-brand-primary px-5 py-3 text-sm font-medium text-brand-on-primary shadow-card transition-colors hover:bg-brand-primary-dark">
              Show {total} {total === 1 ? "gift" : "gifts"}
            </Dialog.Close>
          </footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

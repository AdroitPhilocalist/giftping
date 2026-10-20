import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { caveat } from "@/components/diary/fonts";
import { SITE } from "@/lib/site";
import { readingMinutes } from "@/lib/legal/reading-time";
import { cn } from "@/lib/utils/cn";
import { InstrumentClauses } from "./InstrumentClauses";
import { InstrumentContents } from "./InstrumentContents";
import { InstrumentSeal } from "./InstrumentSeal";
import { PrintButton } from "./PrintButton";
import type { LegalSection } from "./types";
import "./legal.css";

/** One "particular" printed in the instrument's summary block. The note should restate something the clauses already say. */
export interface InstrumentFact {
  icon: LucideIcon;
  label: string;
  note: string;
}

export interface InstrumentPageProps {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  updated: string;
  sections: LegalSection[];
  /** The short block of particulars under the masthead. Omit for a document that doesn't warrant one. */
  facts?: InstrumentFact[];
  /** What the document calls itself in the masthead, e.g. "Vendor terms". */
  recordLabel?: string;
  /** Shown under the signature. Use it to say plainly what reading (and not reading) this page does. */
  closing?: string;
  /** Buttons placed at the foot of the sheet, beside "Print this copy". */
  actions?: ReactNode;
  className?: string;
}

/**
 * A policy rendered as an instrument rather than an article: a warm paper sheet held between two brass rods, ruled down the
 * margin, numbered in the gutter, sealed and — until the text has been through legal review — stamped DRAFT.
 *
 * Nothing here is vendor-specific. `/vendor/terms` is its first use; any policy or agreement can pass the same `LegalSection[]`
 * and get the same document, and `InstrumentClauses` / `InstrumentSeal` / `PrintButton` can be used on their own inside a vendor
 * dashboard (an agreement panel, a downloadable schedule) without taking the whole page.
 *
 * Every claim is the caller's: this component adds furniture, not facts.
 */
export function InstrumentPage({
  eyebrow,
  title,
  intro,
  updated,
  sections,
  facts = [],
  recordLabel = "Legal record",
  closing,
  actions,
  className,
}: InstrumentPageProps) {
  const minutes = readingMinutes(sections);
  const items = sections.map((section, i) => ({ id: `clause-${i + 1}`, heading: section.heading }));
  const draft = !SITE.legalReviewed;

  return (
    <article className={cn("deed-scope pb-10", caveat.variable, className)} aria-labelledby="deed-title">
      <header className="deed-noprint relative pb-10">
        <div className="flex items-center gap-3 sm:gap-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-secondary-dark">{eyebrow}</p>
          <span aria-hidden="true" className="hidden h-px flex-1 bg-brand-dark/10 sm:block" />
          <p className="hidden text-[10px] uppercase tracking-[0.22em] text-brand-dark/55 sm:block">{SITE.name} · Legal</p>
        </div>

        <div className="mt-7 flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 max-w-2xl">
            <h1 id="deed-title" className="font-heading text-[2.6rem] leading-[1.03] tracking-[-0.02em] text-brand-dark sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-brand-dark/70 sm:text-lg">{intro}</p>
          </div>
          {draft ? (
            <span className="deed-stamp mt-1 hidden shrink-0 sm:inline-flex" aria-hidden="true">
              <span className="deed-stamp-line">Draft</span>
              <span className="deed-stamp-rule" />
              <span className="deed-stamp-fine">Awaiting legal review</span>
            </span>
          ) : null}
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[14.5rem_minmax(0,1fr)] xl:gap-12">
        <InstrumentContents items={items} />

        <div className="min-w-0">
          <div className="deed-roll deed-roll--top" aria-hidden="true" />
          <div className="deed-sheet">
            <div className="px-5 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
              <div className="flex flex-wrap items-start justify-between gap-6 border-b border-brand-dark/20 pb-5">
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center border border-brand-secondary/40 font-heading text-[1.05rem] tracking-[0.02em] text-brand-secondary-dark"
                  >
                    GP
                  </span>
                  <div>
                    <p className="font-heading text-[1.3rem] leading-none text-brand-dark">{SITE.name}</p>
                    <p className="mt-1.5 text-[10px] uppercase tracking-[0.26em] text-brand-dark/65">{recordLabel}</p>
                  </div>
                </div>
                <div className="text-left text-[10px] uppercase leading-relaxed tracking-[0.16em] text-brand-dark/65 sm:text-right">
                  <p>Issued {updated}</p>
                  <p>
                    {sections.length} clauses · about {minutes} min
                  </p>
                </div>
              </div>
              <div aria-hidden="true" className="mt-1 border-b border-brand-dark/10" />

              {facts.length ? (
                <div className="deed-facts mt-7">
                  {facts.map((fact) => (
                    <div key={fact.label} className="deed-fact">
                      <p className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-brand-secondary-dark">
                        <fact.icon className="h-3.5 w-3.5" aria-hidden="true" />
                        {fact.label}
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/65">{fact.note}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              {draft ? (
                <div role="note" className="deed-notice mt-7">
                  <p className="text-sm leading-relaxed text-brand-dark/75">
                    <span className="font-medium text-brand-dark">Draft.</span> This page describes how {SITE.name} works today in plain language. It is
                    awaiting a legal review and may change before launch.
                  </p>
                </div>
              ) : null}

              <InstrumentClauses sections={sections} />

              <footer className="mt-14">
                <div className="flex flex-wrap items-end justify-between gap-8 border-t border-brand-dark/15 pt-8">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-brand-dark/65">Issued by</p>
                    <p className="deed-signature mt-2">{SITE.name}</p>
                    <p className="mt-2 text-xs text-brand-dark/65">Vendor relations · {updated}</p>
                  </div>
                  <InstrumentSeal className="-mb-1" />
                </div>

                {closing ? <p className="mt-8 max-w-xl text-sm leading-relaxed text-brand-dark/70">{closing}</p> : null}

                {actions ? (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    {actions}
                    <PrintButton />
                  </div>
                ) : null}

                <p className="mt-12 text-center text-[10px] uppercase tracking-[0.28em] text-brand-dark/50">
                  End of record · {sections.length} clauses
                </p>
              </footer>
            </div>
          </div>
          <div className="deed-roll deed-roll--bottom" aria-hidden="true" />
        </div>
      </div>
    </article>
  );
}

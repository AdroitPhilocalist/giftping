import { PageHero } from "@/components/pages/PageHero";
import { LegalBodyView } from "@/components/legal/LegalBodyView";
import type { LegalSection } from "@/components/legal/types";
import { SITE } from "@/lib/site";

export type { LegalBody, LegalSection } from "@/components/legal/types";

/** A policy page: readable width, numbered headings, and a visible "draft" notice until the client's advisers have signed the text off (lib/site.ts). */
export function LegalPage({ eyebrow, title, intro, updated, sections }: { eyebrow: string; title: string; intro: string; updated: string; sections: LegalSection[] }) {
  return (
    <div>
      <PageHero eyebrow={eyebrow} title={title} subtitle={intro} />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {SITE.legalReviewed ? null : (
          <p role="note" className="mb-8 rounded-card border border-brand-secondary/30 bg-brand-accent/60 px-5 py-4 text-sm text-brand-dark/80">
            <span className="font-medium text-brand-dark">Draft.</span> This page describes how {SITE.name} works today in plain language. It is awaiting a legal review and may change before launch.
          </p>
        )}
        <p className="text-xs uppercase tracking-widest text-brand-dark/45">Last updated {updated}</p>
        <div className="mt-6 space-y-9">
          {sections.map((s, i) => (
            <section key={s.heading} aria-labelledby={`sec-${i}`}>
              <h2 id={`sec-${i}`} className="font-heading text-2xl text-brand-dark">
                <span className="mr-2 text-brand-secondary">{i + 1}.</span>
                {s.heading}
              </h2>
              <div className="mt-3 space-y-3 leading-relaxed text-brand-dark/75">
                <LegalBodyView body={s.body} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

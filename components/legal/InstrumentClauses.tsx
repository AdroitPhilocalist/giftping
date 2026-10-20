import { LegalBodyView } from "./LegalBodyView";
import type { LegalSection } from "./types";

/**
 * The clauses of an instrument: numbered in the margin, set on the paper's measure, each one linkable. Reusable wherever a
 * document needs numbered sections (a vendor agreement, a schedule, a policy excerpt).
 */
export function InstrumentClauses({ sections, startAt = 1 }: { sections: LegalSection[]; startAt?: number }) {
  return (
    <div className="deed-clauses mt-11 space-y-10 sm:space-y-12">
      {sections.map((section, i) => {
        const n = startAt + i;
        const id = `clause-${n}`;
        return (
          <section key={section.heading} aria-labelledby={id} className="deed-clause">
            <span className="deed-clause-num font-heading" aria-hidden="true">
              {String(n).padStart(2, "0")}
            </span>
            <div className="group flex items-baseline gap-1">
              <h2 id={id} className="scroll-mt-28 font-heading text-[1.5rem] leading-snug text-brand-dark sm:text-[1.65rem]">
                {section.heading}
              </h2>
              <a href={`#${id}`} className="deed-anchor" aria-label={`Link to clause ${n}: ${section.heading}`}>
                #
              </a>
            </div>
            <div className="mt-3 space-y-3.5 text-[1.02rem] leading-[1.75] text-brand-dark/75">
              <LegalBodyView body={section.body} />
            </div>
          </section>
        );
      })}
    </div>
  );
}

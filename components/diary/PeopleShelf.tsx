import { Users } from "lucide-react";
import Link from "next/link";
import { OccasionSticker } from "./art/OccasionSticker";
import { SectionTitle } from "./book/SectionTitle";
import { Polaroid } from "./book/Polaroid";
import { daysShort, tiltFor } from "@/lib/diary/present";
import type { PersonCardData } from "@/lib/diary/ui-types";

/** "Your people": a shelf of polaroids, each with the days to their next moment. `actions` holds the "+ Add a person / date" buttons. */
export function PeopleShelf({ people, actions, themeId, limit = 10, className }: { people: PersonCardData[]; actions?: React.ReactNode; themeId?: string; limit?: number; className?: string }) {
  const shown = people.slice(0, limit);
  const more = people.length - shown.length;
  return (
    <section aria-labelledby="people-h" className={className}>
      <SectionTitle id="people-h" icon={<Users />} action={actions}>Your people</SectionTitle>
      {people.length === 0 ? (
        <p className="dy-hand mt-4 text-[1.3rem] text-[var(--dy-ink-soft)]">No one here yet — add the first person you love.</p>
      ) : (
        <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-7 sm:grid-cols-5 xl:mt-4 xl:gap-y-4">
          {shown.map((p, i) => (
            <li key={p.id} className="dy-in" style={{ ["--in-delay" as string]: `${240 + i * 70}ms` }}>
              <Polaroid href={`/diary/people/${p.id}`} name={p.name} photoUrl={p.photoUrl} tilt={tiltFor(i, 2.2)} className="xl:[--photo-ratio:5/4]" tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "apricot" : "sage"} caption={<>{p.name}{p.isFavorite ? <span className="ml-0.5 text-[var(--dy-gold)]" aria-label="favourite"> ★</span> : null}</>}>
                <span className="dy-hand flex items-center justify-center gap-1 pb-0.5 text-[1.05rem] leading-none text-[var(--gp-copper-dark)]">
                  {p.next ? <><OccasionSticker type={p.next.eventType} themeId={themeId} className="h-5 w-5" />{daysShort(p.next.daysAway)}</> : <span className="text-[var(--dy-ink-soft)]">no dates yet</span>}
                </span>
              </Polaroid>
            </li>
          ))}
        </ul>
      )}
      {more > 0 ? <p className="mt-5 text-center"><Link href="/diary/people" className="dy-link">and {more} more — see everyone →</Link></p> : null}
    </section>
  );
}

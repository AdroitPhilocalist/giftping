"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { PersonCardData } from "@/lib/diary/ui-types";
import { daysShort, tiltFor } from "@/lib/diary/present";
import { OccasionSticker } from "./art/OccasionSticker";
import { Polaroid } from "./book/Polaroid";

/** Everyone in the diary as a shelf of polaroids, with a search box once the shelf gets long. */
export function PeopleBrowser({ people, themeId }: { people: PersonCardData[]; themeId?: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? people.filter((p) => p.name.toLowerCase().includes(needle) || (p.relationship ?? "").toLowerCase().includes(needle)) : people;
  }, [people, q]);
  return (
    <div>
      {people.length > 8 ? (
        <div className="relative mt-4 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dy-ink-soft)]" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find someone…" aria-label="Find someone in your diary" className="dy-field !pl-9" />
        </div>
      ) : null}
      {shown.length === 0 ? (
        <p className="dy-hand mt-6 text-[1.3rem] text-[var(--dy-ink-soft)]">No one by that name.</p>
      ) : (
        <ul className="mt-7 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-5">
          {shown.map((p, i) => (
            <li key={p.id}>
              <Polaroid href={`/diary/people/${p.id}`} name={p.name} photoUrl={p.photoUrl} tilt={tiltFor(i, 2.2)} tape={i % 3 === 0 ? "blush" : i % 3 === 1 ? "apricot" : "sage"} caption={<>{p.name}{p.isFavorite ? <span className="ml-0.5 text-[var(--dy-gold)]" aria-label="favourite"> ★</span> : null}</>}>
                <span className="dy-hand flex items-center justify-center gap-1 pb-0.5 text-[1.05rem] leading-none whitespace-nowrap text-[var(--gp-copper-dark)]">
                  {p.next ? <><OccasionSticker type={p.next.eventType} themeId={themeId} className="h-5 w-5" />{daysShort(p.next.daysAway)}</> : <span className="text-[var(--dy-ink-soft)]">no dates yet</span>}
                </span>
              </Polaroid>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

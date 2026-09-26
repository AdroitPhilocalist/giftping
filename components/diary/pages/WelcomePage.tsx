import Link from "next/link";
import { Check } from "lucide-react";
import { HeartDoodle } from "../art/Doodles";
import { OccasionSticker } from "../art/OccasionSticker";
import { Sprig } from "../art/Sprig";
import { BookmarkSeal } from "../BookmarkSeal";
import { SectionTitle } from "../book/SectionTitle";
import { AddDateButton, type PersonOption } from "../forms/DiaryDialogs";
import { MomentTickets } from "../MomentTickets";
import { PLAN_COPY, PLAN_STEPS, stepIndex, type PlanStatus } from "@/lib/diary/plans";
import { daysLabel, possessive } from "@/lib/diary/present";
import type { MomentCardData } from "@/lib/diary/ui-types";

export interface PlanChipData {
  key: string;
  contactId: string;
  eventId: string;
  title: string;
  eventType: string;
  daysAway: number;
  status: PlanStatus;
  giftName: string | null;
}

/** Page 1 of the diary: whose diary it is, what is coming up next, and the gift plans in progress. */
export function WelcomePage({ name, moments, plans, options, themeId }: { name: string; moments: MomentCardData[]; plans: PlanChipData[]; options: PersonOption[]; themeId?: string }) {
  return (
    <div className="flex h-full flex-col gap-4">
      <header className="relative pb-1 pt-1">
        <Sprig variant="daisy" className="absolute -left-2 top-2 h-28 w-[4.2rem]" />
        <div className="dy-head-pad relative pl-14 pr-[11.5rem]">
          <h1 className="dy-title dy-in" style={{ fontSize: "clamp(2.3rem, 3.1vw, 3.2rem)" }}>
            {possessive(name)}
            <br />
            Gifting Diary <HeartDoodle className="align-top text-[0.32em]" />
          </h1>
        </div>
        <p className="dy-in dy-tag-pad mt-2 pl-14 pr-[11.5rem]" style={{ ["--in-delay" as string]: "120ms" }}><span className="dy-marker dy-sub !text-[1.15rem]">Because the best gifts come from a remembering heart</span></p>
        <BookmarkSeal top="-1.35rem" className="dy-seal" />
      </header>

      <MomentTickets moments={moments} themeId={themeId} className="mt-3" addAction={<AddDateButton people={options} />} />

      <section aria-labelledby="plans-h" className="dy-hide-short">
        <SectionTitle id="plans-h" icon={<Check />}>Gift plans</SectionTitle>
        {plans.length === 0 ? (
          <p className="dy-hand mt-2 text-[1.25rem] leading-[1.15] text-[var(--dy-ink-soft)]">Nothing planned yet — open a moment above and pick a gift.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {plans.slice(0, 3).map((p) => (
              <li key={p.key}>
                <Link href={`/diary/people/${p.contactId}?event=${p.eventId}#plan`} className="flex items-center gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-[color-mix(in_srgb,var(--dy-blush)_40%,transparent)]">
                  <OccasionSticker type={p.eventType} themeId={themeId} className="h-8 w-8 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="dy-hand-b block truncate text-[1.3rem] leading-[1.05]">{p.title}</span>
                    <span className="dy-cap block truncate leading-[1.1]">{p.giftName ?? "Idea"} · {p.daysAway <= 0 ? "today" : daysLabel(p.daysAway)}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1" role="img" aria-label={`Plan step: ${PLAN_COPY[p.status].title}`}>
                    {PLAN_STEPS.map((s) => <span key={s} className="h-2.5 w-2.5 rounded-full border border-[var(--gp-copper)]/50" style={{ background: stepIndex(s) <= stepIndex(p.status) ? "var(--gp-primary)" : "transparent" }} />)}
                    <span className="dy-hand ml-1 w-[4.6rem] text-[1.05rem] leading-none text-[var(--gp-copper-dark)]">{PLAN_COPY[p.status].title}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

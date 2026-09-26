import { BookOpen, CalendarDays, Gift, Lock, PenLine, Trophy, Users } from "lucide-react";
import { HeartDoodle } from "../art/Doodles";
import { Sprig } from "../art/Sprig";
import { WaxSeal } from "../art/WaxSeal";
import { ContentsRow } from "../flip/ContentsRow";
import { AddDateButton, AddPersonButton, type PersonOption } from "../forms/DiaryDialogs";
import { PageHeading } from "./PageBits";

export interface ContentsEntry { to: string; page: number; label: string; kind: "today" | "month" | "ideas" | "people" | "year" | "gifting" | "log" }
const ICONS = { today: BookOpen, month: CalendarDays, ideas: Gift, people: Users, year: CalendarDays, gifting: Trophy, log: PenLine } as const;

/** The diary's contents: every section with its page — press a line and the book turns there. It grows as the diary does. */
export function ContentsPage({ entries, options, count }: { entries: ContentsEntry[]; options: PersonOption[]; count: number }) {
  return (
    <div className="relative flex h-full flex-col">
      <PageHeading sub={`${count} ${count === 1 ? "person" : "people"} and everything you want to remember about them`}>Contents</PageHeading>
      <ul className="dy-contents mt-5 space-y-0.5">
        {entries.map((e) => {
          const Icon = ICONS[e.kind];
          return <ContentsRow key={e.to} to={e.to} page={e.page} icon={<Icon className="h-5 w-5 text-[var(--gp-copper)]" strokeWidth={1.6} />}>{e.label}</ContentsRow>;
        })}
      </ul>
      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-2"><AddPersonButton /><AddDateButton people={options} /></div>
        <p className="dy-hand mt-3 flex items-center gap-2 text-[1.2rem] leading-[1.1] text-[var(--dy-ink-soft)]"><WaxSeal size={30}><Lock className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" /></WaxSeal> Only you can open this <HeartDoodle /></p>
      </div>
      <Sprig variant="wild" className="dy-corner !absolute bottom-6 right-0 h-28 w-14" />
    </div>
  );
}

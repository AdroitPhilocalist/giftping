import { Star, Wallet } from "lucide-react";
import { HeartDoodle } from "../art/Doodles";
import { Sprig } from "../art/Sprig";
import { Polaroid } from "../book/Polaroid";
import { NewPersonReveal } from "./NewPersonReveal";
import { AddPhotoButton, EditPersonButton, RemoveButton } from "../forms/DiaryDialogs";
import type { DiaryContactRow } from "@/lib/diary/view";
import { formatCurrency } from "@/lib/utils/format";

/** The top of a person's page: their photo in a polaroid, their name, the line about them, their usual budget. */
export function PersonHeader({ contact, photoUrl, justAdded = false }: { contact: DiaryContactRow; photoUrl: string | null; justAdded?: boolean }) {
  const budget = contact.budget_max ? Number(contact.budget_max) : null;
  return (
    <header className="relative grid items-start gap-x-6 gap-y-4 sm:grid-cols-[auto_1fr]">
      <div className="relative mx-auto w-[9.6rem] shrink-0 sm:mx-0 sm:w-[11.2rem]">
        <Sprig variant="daisy" className="absolute -left-7 -bottom-3 z-[2] h-28 w-14" />
        <NewPersonReveal justAdded={justAdded}>
          <Polaroid photoUrl={photoUrl} name={contact.name} tilt={-3} tape="blush" caption={contact.relationship ?? contact.name} className="!p-2 !pb-1" ratio="4 / 5" />
        </NewPersonReveal>
        {photoUrl ? null : <p className="mt-3 text-center"><AddPhotoButton contact={contact} /></p>}
      </div>
      <div className="min-w-0 pt-1 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
          <h1 className="dy-title break-words" style={{ fontSize: "clamp(2.8rem, 5vw, 4.2rem)" }}>{contact.name}</h1>
          <HeartDoodle className="text-[1.6rem]" />
          {contact.is_favorite ? <Star className="h-7 w-7 fill-[var(--dy-gold)] text-[var(--dy-gold)]" aria-label="Favourite" /> : null}
          {contact.relationship ? <span className="dy-note dy-note--peach dy-hand !px-4 !py-1 text-[1.3rem] leading-none" style={{ ["--torn" as string]: "var(--dy-torn-2)", ["--tilt" as string]: "2deg" }}>{contact.relationship}</span> : null}
        </div>
        {contact.tagline ? (
          <p className="mt-3"><span className="dy-marker dy-marker--blush dy-sub !text-[1.4rem]">{contact.tagline}</span></p>
        ) : (
          <p className="dy-sub mt-2 !text-[1.15rem] opacity-80">What makes them special? <span className="dy-cap">Add a line about them →</span></p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 sm:justify-start">
          <p className="dy-hand inline-flex items-center gap-2 text-[1.35rem]">
            <Wallet className="h-5 w-5 text-[var(--gp-copper)]" strokeWidth={1.7} aria-hidden="true" />
            <span className="dy-cap !text-[1.15rem]">Usual budget</span>
            <span className="dy-hand-b text-[1.6rem]">{budget ? formatCurrency(budget) : "—"}</span>
          </p>
          <span className="flex items-center gap-3">
            <EditPersonButton contact={contact} photoUrl={photoUrl} />
            <RemoveButton kind="contact" id={contact.id} name={contact.name} />
          </span>
        </div>
      </div>
    </header>
  );
}

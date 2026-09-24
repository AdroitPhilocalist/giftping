import { Sprig } from "./art/Sprig";
import { BookmarkSeal } from "./BookmarkSeal";
import { WaxSeal } from "./art/WaxSeal";
import { Robin } from "@/components/art/Robin";
import { Lock } from "lucide-react";
import { HeartDoodle } from "./art/Doodles";
import { possessive } from "@/lib/diary/present";

/** The top of the left page (wide screens): "Priya's Gifting Diary", the promise under it, and the sealed ribbon. */
export function HomeHeader({ name }: { name: string }) {
  return (
    <header className="relative hidden pb-4 pt-2 xl:block">
      <Sprig variant="daisy" className="absolute -left-2 top-3 h-40 w-[5.5rem]" />
      <div className="relative pl-[4rem] pr-[12.5rem] xl:pl-[4.4rem]">
        <h1 className="dy-title dy-in" style={{ fontSize: "clamp(2.5rem, 3.9vw, 3.75rem)" }}>
          {possessive(name)}
          <br />
          Gifting Diary <HeartDoodle className="align-top text-[0.32em]" />
        </h1>
        <p className="dy-in mt-3" style={{ ["--in-delay" as string]: "120ms" }}>
          <span className="dy-marker dy-sub">Because the best gifts come from a remembering heart</span>
        </p>
      </div>
      <BookmarkSeal />
    </header>
  );
}

/** The same greeting on a phone: the closed green leather cover with gold-foil lettering, the robin on top and the padlock tag. */
export function MobileCover({ name }: { name: string }) {
  return (
    <div className="relative mx-auto mb-3 max-w-[78rem] pt-10 xl:hidden">
      <div className="pointer-events-none absolute right-6 top-0 z-10 w-24" aria-hidden="true">
        <div className="dy-bob"><Robin pose="perched" title="" priority /></div>
      </div>
      <div className="dy-cover">
        <Sprig variant="daisy" className="absolute -left-1 bottom-0 h-32 w-16 opacity-90" />
        <div className="relative pl-12 pr-2 text-left">
          <h1 className="dy-title dy-foil text-[clamp(2.5rem,11vw,3.4rem)]">{possessive(name)}<br />Gifting Diary</h1>
          <p className="dy-hand mt-2 text-[1.25rem] text-[var(--dy-foil)] opacity-90">All the people who make life more special <HeartDoodle className="!text-[var(--dy-foil)]" /></p>
        </div>
        <div className="relative mt-3 flex justify-end pr-1">
          <div className="dy-note dy-note--peach dy-hand flex items-center gap-2 px-3 py-2 text-[1.15rem] leading-[1.05] text-[var(--dy-ink)]" style={{ ["--tilt" as string]: "3deg", ["--torn" as string]: "var(--dy-torn-2)" }}>
            <WaxSeal size={34}><Lock className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></WaxSeal>
            Only you<br />can open this
          </div>
        </div>
      </div>
    </div>
  );
}

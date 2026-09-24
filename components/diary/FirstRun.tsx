import { Robin } from "@/components/art/Robin";
import { Lock } from "lucide-react";
import { OccasionSticker } from "./art/OccasionSticker";
import { Sprig } from "./art/Sprig";
import { WaxSeal } from "./art/WaxSeal";
import { OpenDiaryButton } from "./forms/DiaryDialogs";
import { Monogram } from "./book/Polaroid";

/** A desk calendar with a heart on one date — the picture for "Save their special dates". */
function DeskCalendar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 96" className={className} aria-hidden="true" focusable="false">
      <path d="M12 22h86l4 66H8z" fill="var(--dy-paper-hi)" stroke="var(--dy-paper-edge)" strokeWidth="1.5" />
      <path d="M12 22h86l1 12H11z" fill="var(--dy-rose)" />
      {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M${20 + i * 10} 14v14`} stroke="var(--dy-ink-soft)" strokeWidth="2.6" strokeLinecap="round" />)}
      {Array.from({ length: 4 }, (_, r) => Array.from({ length: 6 }, (_, c) => <rect key={`${r}-${c}`} x={16 + c * 13} y={42 + r * 11} width="8" height="6" rx="1.4" fill="var(--dy-paper-lo)" />))}
      <path d="M55 76c-6-4-8-7-6-10 2-2 5-1 6 1 1-2 4-3 6-1 2 3 0 6-6 10z" fill="var(--dy-heart)" />
    </svg>
  );
}

const STEPS = [
  { n: 1, text: "Add someone you love", tape: "blush", tone: "dy-note--peach", n_bg: "var(--dy-rose)" },
  { n: 2, text: "Save their special dates", tape: "sage", tone: "dy-note--sage", n_bg: "var(--dy-sage)" },
  { n: 3, text: "We remind you, with gift ideas", tape: "mustard", tone: "dy-note--cream", n_bg: "var(--dy-mustard)" },
] as const;

/**
 * The very first time: a closed leather diary on the desk, a promise, and three short steps. "Open my diary" opens the "add someone you love" page.
 * (This is what an empty diary looks like — the moment that has to make someone want to start.)
 */
export function FirstRun({ firstName }: { firstName: string }) {
  return (
    <div className="mx-auto grid max-w-6xl items-center gap-x-12 gap-y-10 py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:py-10">
      <div className="flex flex-col items-center lg:items-start">
        <div className="relative pt-12">
          <div className="pointer-events-none absolute -top-1 left-1/2 z-10 w-[8.2rem] -translate-x-[10%]" aria-hidden="true"><div className="dy-bob"><Robin pose="peeking" title="" priority /></div></div>
          <div className="dy-closed dy-in">
            <span className="dy-closed-pages" aria-hidden="true" />
            <div className="dy-closed-cover">
              <span className="dy-closed-spine" aria-hidden="true" />
              <div className="dy-closed-frame">
                <div className="mx-auto w-[5.8rem]"><Robin pose="perched" title="" /></div>
                <p className="dy-hand dy-foil mt-0.5 text-center text-[1.5rem] leading-none">My</p>
                <p className="dy-hand-b dy-foil text-center text-[2.4rem] leading-[0.95]">Gifting Diary</p>
                <svg viewBox="0 0 160 14" className="mx-auto mt-2 w-28" aria-hidden="true" focusable="false"><path d="M4 8c20-8 30 6 46 0s24-8 30 0 24 8 40 0 24-4 36-2" fill="none" stroke="var(--dy-foil)" strokeWidth="1.6" strokeLinecap="round" /></svg>
              </div>
            </div>
            <span className="dy-closed-strap" aria-hidden="true"><i /></span>
            <span className="dy-ribbon !left-[2.6rem] !top-auto !bottom-[-2.7rem] !h-[5rem]" aria-hidden="true" style={{ animation: "none" }} />
          </div>
        </div>
        <div className="mt-8 text-center lg:text-left">
          <h1 className="dy-on-wood-heading font-heading text-[2.1rem] font-medium italic leading-tight sm:text-[2.6rem]">Never miss a moment that matters</h1>
          <svg viewBox="0 0 320 10" preserveAspectRatio="none" className="mx-auto mt-1 h-2 w-[min(20rem,100%)] text-[var(--gp-copper)] lg:mx-0" aria-hidden="true" focusable="false"><path d="M2 6c50-5 110-6 170-3s100 3 146-1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
          <p className="dy-ui dy-on-wood mt-3 max-w-md text-[0.98rem] leading-relaxed opacity-95">{firstName ? `${firstName}, k` : "K"}eep the people you love and their special moments in one beautiful place — private, and only ever yours.</p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-5 lg:justify-start">
            <OpenDiaryButton />
            <div className="flex items-center gap-2"><WaxSeal size={44}><Lock className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.4} aria-hidden="true" /></WaxSeal><span className="dy-hand dy-on-wood text-[1.25rem] leading-[1.05]">Only you can<br />open this</span></div>
          </div>
        </div>
      </div>

      <ol className="mx-auto w-full max-w-md space-y-5 lg:max-w-none" aria-label="How it works">
        {STEPS.map((s, i) => (
          <li key={s.n} className="dy-in" style={{ ["--in-delay" as string]: `${300 + i * 140}ms` }}>
            <div className={`dy-note ${s.tone} flex items-center gap-4 px-5 py-4`} style={{ ["--torn" as string]: `var(--dy-torn-${i + 1})`, ["--tilt" as string]: `${[-1.4, 1, -0.6][i]}deg` }}>
              <span className={`dy-tape dy-tape--${s.tape}`} style={{ top: "-0.6rem", left: `${[30, 55, 40][i]}%` }} aria-hidden="true" />
              <span className="dy-step-no" style={{ background: s.n_bg }} aria-hidden="true">{s.n}</span>
              <p className="dy-hand-b flex-1 text-[1.65rem] leading-[1.02]">{s.text}</p>
              <div className="relative w-[6.4rem] shrink-0" aria-hidden="true">
                {i === 0 ? (
                  <div className="flex">
                    <div className="dy-polaroid !p-1 !pb-3 w-11" style={{ ["--tilt" as string]: "-6deg" }}><span className="dy-polaroid-photo block"><Monogram name="Priya" size="1.4rem" /></span></div>
                    <div className="dy-polaroid !p-1 !pb-3 -ml-2 mt-1 w-11" style={{ ["--tilt" as string]: "5deg" }}><span className="dy-polaroid-photo block"><Monogram name="Arjun" size="1.4rem" /></span></div>
                  </div>
                ) : i === 1 ? <DeskCalendar className="w-[5.2rem]" /> : <OccasionSticker type="other" className="h-[4.2rem] w-[4.2rem]" />}
              </div>
              <Sprig variant={i === 1 ? "wild" : "daisy"} className="dy-corner !right-1 !top-auto !bottom-0 h-16 w-8 opacity-80" />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

import { BarChart3, CalendarCheck, Feather, Gift, Heart } from "lucide-react";
import type { GiftingScore } from "@/lib/diary/gifting-score";
import { WaxSeal } from "./art/WaxSeal";
import { SectionTitle } from "./book/SectionTitle";

const ICONS = { preparedness: Gift, knowing: Heart, coverage: CalendarCheck, consistency: Feather } as const;

/** The Gifting Score, pressed into wax: the number, its label, and one slim bar per factor. Numbers come from computeGiftingScore(). */
export function ScoreSeal({ score, className }: { score: GiftingScore; className?: string }) {
  return (
    <section aria-labelledby="score-h" className={className}>
      <SectionTitle id="score-h" icon={<BarChart3 />}>Gifting Score</SectionTitle>
      <div className="mt-4 grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        <div className="mx-auto sm:mx-0" role="img" aria-label={`Gifting score ${score.score} out of 100: ${score.label}`}>
          <WaxSeal size={158} animate>
            <span className="block">
              <span className="dy-num block text-[3.6rem]">{score.score}</span>
              <span className="dy-hand mt-0.5 block text-[1.2rem] leading-[1]">{score.label === "Gifting pro" ? "Gifting Pro" : score.label}</span>
            </span>
          </WaxSeal>
        </div>
        <ul className="space-y-3">
          {score.breakdown.map((b) => {
            const Icon = ICONS[b.key];
            const pct = Math.round((b.points / b.max) * 100);
            return (
              <li key={b.key} className="grid grid-cols-[1.6rem_1fr] items-center gap-x-3">
                <Icon className="h-5 w-5 text-[var(--gp-copper)]" strokeWidth={1.7} aria-hidden="true" />
                <div>
                  <div className="dy-hand flex items-baseline justify-between text-[1.15rem] leading-[1.1]"><span>{b.label}</span><span className="dy-ui text-sm font-semibold">{pct}%</span></div>
                  <div className="dy-bar mt-1" role="presentation"><i style={{ ["--pct" as string]: `${pct}%` }} /></div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="dy-hand mt-3 text-[1.25rem] leading-[1.15] text-[var(--dy-ink-soft)]">{score.nextBestAction}</p>
    </section>
  );
}

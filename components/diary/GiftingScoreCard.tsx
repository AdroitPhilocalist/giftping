import type { GiftingScore } from "@/lib/diary/gifting-score";

/** The score ring + breakdown. Purely presentational: the numbers come from computeGiftingScore(). */
export function GiftingScoreCard({ score }: { score: GiftingScore }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  return (
    <section aria-labelledby="score-heading" className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-5">
      <h2 id="score-heading" className="font-heading text-lg text-brand-dark">Your Gifting Score</h2>
      <div className="mt-3 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0" role="img" aria-label={`Gifting score ${score.score} out of 100, ${score.label}`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-brand-accent" />
            <circle
              cx="50" cy="50" r={radius} fill="none" strokeWidth="9" strokeLinecap="round"
              className="stroke-brand-primary transition-[stroke-dashoffset] duration-700"
              strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score.score / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-heading text-3xl text-brand-dark">{score.score}</span>
            <span className="text-[10px] uppercase tracking-wide text-brand-dark/50">of 100</span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base text-brand-primary">{score.label}</p>
          <p className="mt-1 text-sm text-brand-dark/70">{score.nextBestAction}</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2 border-t border-brand-dark/10 pt-4 text-xs">
        {score.breakdown.map((b) => (
          <li key={b.key}>
            <div className="flex justify-between text-brand-dark/70"><span>{b.label}</span><span>{b.points}/{b.max}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-brand-accent">
              <div className="h-full rounded-full bg-brand-secondary" style={{ width: `${(b.points / b.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

import { HeartDoodle } from "./art/Doodles";
import { cn } from "@/lib/utils/cn";

/** A cream rosette with a laurel, a crown and a green bow: "N special days remembered in a row". Shown from three onwards — a streak of one isn't one yet. */
const ROSETTE = (() => {
  const points: string[] = [];
  for (let i = 0; i < 96; i++) {
    const t = (i / 96) * Math.PI * 2;
    const r = 43 + 3.2 * Math.abs(Math.sin(12 * t));
    points.push(`${(60 + r * Math.cos(t)).toFixed(2)} ${(56 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

export function StreakBadge({ count, className, compact = false }: { count: number; className?: string; compact?: boolean }) {
  if (count < 3) return null;
  return (
    <div className={cn("flex items-center gap-3", compact ? "" : "flex-col text-center", className)}>
      <div className="relative shrink-0" style={{ width: compact ? "5.6rem" : "8.4rem" }} role="img" aria-label={`${count} special days remembered in a row`}>
        <svg viewBox="0 0 120 130" aria-hidden="true" focusable="false" className="w-full overflow-visible">
          <path d="M44 16l8 10 8-14 8 14 8-10 2 12H42z" fill="var(--dy-gold)" stroke="var(--dy-foil-lo)" strokeWidth="1.2" strokeLinejoin="round" />
          <path d={ROSETTE} fill="var(--dy-paper-hi)" stroke="var(--gp-copper)" strokeWidth="2" />
          <circle cx="60" cy="56" r="37" fill="none" stroke="var(--gp-copper)" strokeWidth="1.2" strokeDasharray="1.5 3" />
          {Array.from({ length: 9 }, (_, i) => {
            const a = (Math.PI * (0.9 + (i / 8) * 1.2)) ;
            return <ellipse key={`l${i}`} cx={60 + Math.cos(a) * 36} cy={56 + Math.sin(a) * 36} rx="6" ry="2.6" transform={`rotate(${(a * 180) / Math.PI + 90} ${60 + Math.cos(a) * 36} ${56 + Math.sin(a) * 36})`} fill="var(--dy-leaf)" />;
          })}
          <path d="M60 96c-12-2-24 4-30 16 10 2 22-2 30-10zM60 96c12-2 24 4 30 16-10 2-22-2-30-10z" fill="var(--gp-primary)" />
          <path d="M52 100l-6 22M68 100l6 22" stroke="var(--gp-primary)" strokeWidth="5" strokeLinecap="round" />
          <circle cx="60" cy="99" r="5" fill="var(--gp-primary)" />
        </svg>
        <div className="absolute inset-x-0 top-[34%] text-center">
          <span className="dy-num block text-[2.6rem] text-[var(--gp-copper-dark)]" style={{ fontSize: compact ? "1.9rem" : undefined }}>{count}</span>
          <span className="dy-hand block text-[1.05rem] leading-[0.9]" style={{ fontSize: compact ? "0.85rem" : undefined }}>in a row</span>
        </div>
      </div>
      <div className={compact ? "min-w-0" : ""}>
        <p className="dy-hand-b text-[1.45rem] leading-[1.05]">Never missed a special day! <HeartDoodle className="text-[0.55em]" /></p>
        <p className="dy-hand text-[1.15rem] leading-[1.1] text-[var(--dy-ink-soft)]">You&apos;ve remembered {count} in a row. Amazing!</p>
      </div>
    </div>
  );
}

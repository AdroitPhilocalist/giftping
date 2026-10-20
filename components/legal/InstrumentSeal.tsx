import { cn } from "@/lib/utils/cn";

/**
 * An irregular, hand-pressed wax outline: a circle whose radius wobbles, computed once at module scope (deterministic, so the
 * server and the client would agree if this ever became interactive).
 */
const BLOB = (() => {
  const points: string[] = [];
  for (let i = 0; i < 72; i++) {
    const t = (i / 72) * Math.PI * 2;
    const r = 44 + 2.4 * Math.sin(9 * t + 0.6) + 1.4 * Math.sin(5 * t + 1.9) + 0.9 * Math.sin(14 * t);
    points.push(`${(50 + r * Math.cos(t)).toFixed(2)} ${(50 + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${points.join("L")}Z`;
})();

/**
 * The issuer's wax seal, pressed onto the foot of an instrument. Decorative only (aria-hidden): it marks who issued the
 * document, it does not stand in for anyone's acceptance of it.
 */
export function InstrumentSeal({ className, glyph = "GP" }: { className?: string; glyph?: string }) {
  return (
    <span className={cn("deed-seal", className)} aria-hidden="true">
      <span className="deed-seal-tail" />
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <path className="deed-seal-wax" d={BLOB} />
        <circle className="deed-seal-ring" cx="50" cy="50" r="34" />
        <circle className="deed-seal-dots" cx="50" cy="50" r="37.6" />
      </svg>
      <span className="deed-seal-glyph">{glyph}</span>
    </span>
  );
}

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** An irregular, hand-pressed wax outline: a circle whose radius wobbles a little, computed once (deterministic, so server and client agree). */
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
 * A wax seal — the diary's "private, only you" mark and its Gifting Score stamp. Children are laid over the wax (an icon, a number).
 * The colours are the diary's seal variables, derived from the theme's accent.
 */
export function WaxSeal({ size = 96, children, className, animate = false, tone = "copper" }: { size?: number; children?: ReactNode; className?: string; animate?: boolean; tone?: "copper" | "green" }) {
  const id = useId().replace(/:/g, "");
  return (
    <span className={cn("dy-seal", tone === "green" && "dy-seal--green", animate && "dy-stamp", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id={`${id}-g`} cx="36%" cy="28%" r="82%">
            <stop offset="0" stopColor="var(--dy-seal-hi)" />
            <stop offset="0.5" stopColor="var(--dy-seal)" />
            <stop offset="1" stopColor="var(--dy-seal-lo)" />
          </radialGradient>
        </defs>
        <path d={BLOB} fill={`url(#${id}-g)`} />
        <circle cx="50" cy="50" r="35" fill="none" stroke="var(--dy-seal-lo)" strokeOpacity="0.45" strokeWidth="2.2" />
        <circle cx="50" cy="50" r="37.6" fill="none" stroke="var(--dy-seal-hi)" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="1.4 3.2" />
        <path d="M22 30c8-12 24-17 38-13" fill="none" stroke="var(--dy-petal)" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span className="dy-seal-body">{children}</span>
    </span>
  );
}

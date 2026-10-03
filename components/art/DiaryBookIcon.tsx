import { cn } from "@/lib/utils/cn";

/**
 * The Personal Gifting Diary as a little object: a leather-bound book with a gold-foil border and heart, cream pages, a ribbon bookmark and a sparkle. Drawn in code
 * from theme tokens (copper leather, the surface colour for paper) so a festival theme re-colours it. The tilt and the lift-on-hover live on inner groups — the
 * wrapper carries no transform of its own (CLAUDE.md's placement-transform gotcha). `.gp-diary-sparkle` twinkles; the global reduced-motion rule stills it.
 */
export function DiaryBookIcon({ className }: { className?: string }) {
  const stop = (token: string, mix?: string) => ({ stopColor: mix ? `color-mix(in srgb, var(${token}) ${mix}, white)` : `var(${token})` });
  const gold = "color-mix(in srgb, var(--gp-copper) 45%, white 55%)";
  return (
    <svg viewBox="0 0 52 60" className={cn("overflow-visible", className)} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="gp-dbk-leather" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={stop("--gp-copper", "78%")} />
          <stop offset="0.55" style={stop("--gp-copper")} />
          <stop offset="1" style={stop("--gp-copper-dark")} />
        </linearGradient>
        <linearGradient id="gp-dbk-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: gold }} />
          <stop offset="0.5" style={{ stopColor: "color-mix(in srgb, var(--gp-copper) 15%, white 85%)" }} />
          <stop offset="1" style={{ stopColor: gold }} />
        </linearGradient>
      </defs>
      <g className="gp-diary-book-tilt">
        {/* soft shadow under the book */}
        <ellipse cx="27" cy="57" rx="17" ry="2.2" fill="var(--gp-primary-dark)" opacity="0.35" />
        {/* the page block, peeking out right and bottom */}
        <rect x="9" y="6" width="36" height="48" rx="3" fill="var(--gp-surface)" stroke="var(--gp-copper-dark)" strokeOpacity="0.45" strokeWidth="0.8" />
        <path d="M45 9v43M43.2 9v43M41.4 9v43" stroke="var(--gp-copper-dark)" strokeOpacity="0.25" strokeWidth="0.7" />
        {/* the cover */}
        <rect x="6" y="3" width="36" height="48" rx="3.5" fill="url(#gp-dbk-leather)" />
        {/* the spine, with its stitching */}
        <path d="M6 6.5a3.5 3.5 0 0 1 3.5-3.5H13v48H9.5A3.5 3.5 0 0 1 6 47.5z" fill="var(--gp-copper-dark)" opacity="0.55" />
        <path d="M16.5 3v48" stroke="url(#gp-dbk-gold)" strokeWidth="0.9" strokeOpacity="0.8" />
        <path d="M9.5 9h0M9.5 17h0M9.5 25h0M9.5 33h0M9.5 41h0" stroke="url(#gp-dbk-gold)" strokeWidth="1.6" strokeLinecap="round" />
        {/* foil border */}
        <rect x="19.5" y="7" width="19" height="40" rx="1.6" fill="none" stroke="url(#gp-dbk-gold)" strokeWidth="1" />
        {/* heart emblem */}
        <circle cx="29" cy="24" r="6.6" fill="none" stroke="url(#gp-dbk-gold)" strokeWidth="0.9" />
        <path d="M29 28.2c-3.1-2.1-4.3-3.6-4.3-5.2 0-1.3 1-2.2 2.2-2.2.8 0 1.6.4 2.1 1.1.5-.7 1.3-1.1 2.1-1.1 1.2 0 2.2.9 2.2 2.2 0 1.6-1.2 3.1-4.3 5.2z" fill="url(#gp-dbk-gold)" />
        {/* the title lines */}
        <path d="M24 36.5h10M26 40h6" stroke="url(#gp-dbk-gold)" strokeWidth="1" strokeLinecap="round" />
        {/* ribbon bookmark */}
        <path d="M35 51v9l3-2.4 3 2.4v-9z" fill="var(--gp-surface)" stroke="var(--gp-copper-dark)" strokeOpacity="0.4" strokeWidth="0.6" />
      </g>
      {/* a sparkle: the diary is the thing worth noticing */}
      <path className="gp-diary-sparkle" d="M45 0.5c.5 3.2 1.6 4.3 4.8 4.8-3.2.5-4.3 1.6-4.8 4.8-.5-3.2-1.6-4.3-4.8-4.8 3.2-.5 4.3-1.6 4.8-4.8z" fill="var(--gp-copper)" stroke="var(--gp-surface)" strokeWidth="0.8" />
    </svg>
  );
}

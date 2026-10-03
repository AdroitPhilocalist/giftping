import type { CSSProperties } from "react";

export type AmbienceKind = "petals" | "confetti" | "hearts" | "sparks" | "diyas";

/** What drifts across an occasion's header: confetti for birthdays, hearts for anniversaries, petals for weddings and "for her", gold sparks otherwise. */
export function ambienceFor(slug: string): AmbienceKind {
  if (slug === "birthday") return "confetti";
  if (slug === "anniversary") return "hearts";
  if (slug === "wedding" || slug === "for-her") return "petals";
  return "sparks";
}

const COLORS = [
  "var(--gp-copper)",
  "color-mix(in srgb, var(--gp-copper) 55%, var(--gp-canvas))",
  "var(--gp-primary)",
  "color-mix(in srgb, var(--gp-primary) 45%, var(--gp-canvas))",
  "color-mix(in srgb, var(--gp-peach) 60%, var(--gp-copper))",
];

function Shape({ kind }: { kind: AmbienceKind }) {
  switch (kind) {
    case "petals":
      return <svg viewBox="0 0 20 20" className="h-full w-full"><path d="M10 1c5 3 8 8 4 15-2 2-6 2-8 0-4-7-1-12 4-15z" fill="currentColor" /></svg>;
    case "hearts":
      return <svg viewBox="0 0 20 20" className="h-full w-full"><path d="M10 18C3 12.5 1 9 3 5.5 5 2.3 9 3 10 6c1-3 5-3.700 7-.5 2 3.500 0 7-7 12.500z" fill="currentColor" /></svg>;
    case "confetti":
      return <svg viewBox="0 0 20 20" className="h-full w-full"><rect x="4" y="2" width="7" height="16" rx="1.500" fill="currentColor" /></svg>;
    case "diyas": // a little clay lamp with a flame — the bowl takes the cycling colour, the flame is always warm gold
      return (
        <svg viewBox="0 0 20 20" className="h-full w-full">
          <path d="M2 12h16c0 4-3.500 6.500-8 6.500S2 16 2 12z" fill="currentColor" />
          <path d="M10 1.500c2.400 2.600 3 4.600 1.800 6.500-.500.800-1.300 1.200-1.800 1.200s-1.300-.400-1.800-1.200C7 6.100 7.600 4.100 10 1.500z" fill="color-mix(in srgb, var(--gp-copper) 35%, #ffd36b)" /> {/* theme-safe: a flame is always gold */}
        </svg>
      );
    default:
      return <svg viewBox="0 0 20 20" className="h-full w-full"><path d="M10 0l2.200 7.800L20 10l-7.800 2.200L10 20l-2.200-7.800L0 10l7.800-2.200z" fill="currentColor" /></svg>;
  }
}

/** Deterministic (no Math.random: server and client must agree) little things drifting down a hero, behind the text. Decorative; still under reduced motion. */
export function Ambience({ kind, count = 16 }: { kind: AmbienceKind; count?: number }) {
  return (
    <div className="ambient" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => {
        const r = (n: number) => Math.abs(Math.sin(i * 12.9898 + n * 78.233)) % 1;
        const style = {
          "--x": `${Math.round(r(1) * 96)}%`,
          "--s": `${(0.7 + r(2) * 0.9).toFixed(2)}rem`,
          "--dur": `${(12 + r(3) * 12).toFixed(1)}s`,
          "--delay": `${(-r(4) * 20).toFixed(1)}s`,
          "--sway": `${Math.round((r(5) - 0.5) * 8)}rem`,
          "--rot": `${Math.round(200 + r(6) * 400)}deg`,
          "--o": (0.35 + r(7) * 0.4).toFixed(2),
          color: COLORS[i % COLORS.length],
        } as CSSProperties;
        return (
          <i key={i} style={style}>
            <Shape kind={kind} />
          </i>
        );
      })}
    </div>
  );
}

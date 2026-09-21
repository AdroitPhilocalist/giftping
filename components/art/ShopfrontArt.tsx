import { cn } from "@/lib/utils/cn";

/**
 * A boutique shopfront drawn in code: an arched glowing doorway, shelves in the windows, lanterns and a sign. Placeholder for a boutique's real storefront
 * photo (vendors upload their own banner); it recolours with the theme. `name` is drawn on the sign.
 */
export function ShopfrontArt({ name, className }: { name?: string; className?: string }) {
  const sign = (name ?? "Boutique").slice(0, 22);
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax meet" className={cn("h-full w-full", className)} role="img" aria-label={name ? `${name} shopfront` : "A boutique shopfront"} focusable="false">
      <defs>
        <linearGradient id="sf-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--gp-primary-dark)" /><stop offset="1" stopColor="var(--gp-primary)" /></linearGradient>
        <linearGradient id="sf-glow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--gp-peach)" /><stop offset="1" stopColor="var(--gp-copper)" stopOpacity="0.8" /></linearGradient>
        <radialGradient id="sf-lamp" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="var(--gp-peach)" stopOpacity="0.9" /><stop offset="1" stopColor="var(--gp-peach)" stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#sf-wall)" />
      {/* windows */}
      {[[26, 100], [274, 100]].map(([x, y]) => (
        <g key={x}>
          <rect x={x} y={y} width="100" height="150" rx="6" fill="url(#sf-glow)" />
          <rect x={x} y={y} width="100" height="150" rx="6" fill="none" stroke="var(--gp-copper-dark)" strokeOpacity="0.7" strokeWidth="3" />
          {[132, 172, 212].map((sy) => <rect key={sy} x={x + 8} y={sy} width="84" height="4" rx="2" fill="var(--gp-primary-dark)" opacity="0.4" />)}
          {[0, 1, 2].map((k) => <rect key={k} x={x + 14 + k * 26} y={108 + k * 3} width="16" height="24" rx="5" fill="var(--gp-primary-dark)" opacity="0.32" />)}
          {[0, 1, 2].map((k) => <circle key={k} cx={x + 24 + k * 26} cy={158} r="9" fill="var(--gp-copper-dark)" opacity="0.4" />)}
        </g>
      ))}
      {/* arched door */}
      <path d="M150 250V150a50 50 0 0 1 100 0v100z" fill="url(#sf-glow)" />
      <path d="M150 250V150a50 50 0 0 1 100 0v100z" fill="none" stroke="var(--gp-copper-dark)" strokeOpacity="0.8" strokeWidth="4" />
      <path d="M200 100v150M162 176h76" stroke="var(--gp-primary-dark)" strokeOpacity="0.35" strokeWidth="3" />
      <ellipse cx="200" cy="222" rx="44" ry="10" fill="var(--gp-peach)" opacity="0.5" />
      {/* lanterns */}
      {[126, 274].map((x) => (
        <g key={x}>
          <circle cx={x} cy="140" r="26" fill="url(#sf-lamp)" />
          <rect x={x - 5} y="128" width="10" height="20" rx="3" fill="var(--gp-peach)" />
          <line x1={x} y1="112" x2={x} y2="128" stroke="var(--gp-copper-dark)" strokeWidth="2" />
        </g>
      ))}
      {/* sign */}
      <rect x="110" y="44" width="180" height="40" rx="8" fill="var(--gp-primary-dark)" stroke="var(--gp-copper)" strokeOpacity="0.8" strokeWidth="2" />
      <text x="200" y="71" textAnchor="middle" fontFamily="var(--gp-font-display)" fontSize="19" letterSpacing="3" fill="var(--gp-copper)">{sign.toUpperCase()}</text>
      {/* step */}
      <rect x="0" y="250" width="400" height="50" fill="var(--gp-primary-dark)" opacity="0.85" />
      <rect x="120" y="250" width="160" height="10" fill="var(--gp-copper-dark)" opacity="0.5" />
    </svg>
  );
}

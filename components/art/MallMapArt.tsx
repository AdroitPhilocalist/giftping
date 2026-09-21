import { PLAN_POSITIONS } from "@/lib/mall";

// The floor plan's shop rooms, in viewBox (600×640) units, keyed by zone id.
const ROOMS: Record<string, { x: number; y: number; w: number; h: number }> = {
  boutiques: { x: 225, y: 60, w: 150, h: 100 },
  corporate: { x: 50, y: 90, w: 150, h: 120 },
  "for-her": { x: 400, y: 90, w: 150, h: 120 },
  anniversary: { x: 45, y: 250, w: 110, h: 140 },
  "for-him": { x: 445, y: 250, w: 110, h: 140 },
  birthday: { x: 55, y: 430, w: 150, h: 120 },
  wedding: { x: 395, y: 430, w: 150, h: 120 },
};

const TREES: [number, number][] = [[300, 236], [372, 262], [398, 320], [372, 378], [300, 404], [228, 378], [202, 320], [228, 262], [150, 205], [450, 205], [150, 415], [450, 415], [262, 190], [338, 190]];

/** The mall floor plan drawn in code — a themed placeholder for the client's isometric illustration (same nine places, same numbered markers). */
export function MallMapArt({ activeId, className }: { activeId?: string | null; className?: string }) {
  return (
    <svg viewBox="0 0 600 640" className={className} role="img" aria-label="Floor plan of the GiftPing mall" focusable="false">
      <defs>
        <linearGradient id="map-room" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gp-peach)" />
          <stop offset="1" stopColor="var(--gp-copper)" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="map-water" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--gp-surface)" />
          <stop offset="1" stopColor="var(--gp-primary)" stopOpacity="0.4" />
        </radialGradient>
        <filter id="map-shadow" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="var(--gp-ink)" floodOpacity="0.18" /></filter>
      </defs>

      <rect x="18" y="26" width="564" height="594" rx="96" fill="var(--gp-peach)" filter="url(#map-shadow)" />
      <rect x="18" y="26" width="564" height="594" rx="96" fill="none" stroke="var(--gp-copper)" strokeOpacity="0.4" strokeWidth="3" />
      <rect x="38" y="46" width="524" height="554" rx="78" fill="var(--gp-surface)" />
      {/* promenade ring */}
      <rect x="66" y="176" width="468" height="236" rx="60" fill="var(--gp-peach)" opacity="0.6" />
      <circle cx="300" cy="320" r="118" fill="var(--gp-peach)" opacity="0.9" />
      <circle cx="300" cy="320" r="104" fill="none" stroke="var(--gp-copper)" strokeOpacity="0.35" strokeDasharray="4 7" />

      {/* rooms */}
      {Object.entries(ROOMS).map(([id, r]) => {
        const on = activeId === id;
        return (
          <g key={id} style={{ transition: "opacity .3s" }}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx="20" fill="url(#map-room)" opacity={on ? 1 : 0.78} stroke={on ? "var(--gp-copper)" : "var(--gp-copper-dark)"} strokeOpacity={on ? 1 : 0.35} strokeWidth={on ? 4 : 2} />
            <rect x={r.x + 12} y={r.y + 12} width={r.w - 24} height={r.h - 24} rx="12" fill="var(--gp-surface)" opacity="0.45" />
            {[0.28, 0.5, 0.72].map((f) => <rect key={f} x={r.x + 20} y={r.y + r.h * f} width={r.w - 40} height="6" rx="3" fill="var(--gp-copper-dark)" opacity="0.28" />)}
            {[0, 1, 2].map((k) => <circle key={k} cx={r.x + 34 + k * ((r.w - 68) / 2)} cy={r.y + r.h * 0.42} r="8" fill="var(--gp-primary)" opacity="0.5" />)}
          </g>
        );
      })}

      {/* the gift atrium fountain */}
      <circle cx="300" cy="320" r="78" fill="url(#map-water)" stroke={activeId === "atrium" ? "var(--gp-copper)" : "var(--gp-primary)"} strokeOpacity={activeId === "atrium" ? 1 : 0.4} strokeWidth={activeId === "atrium" ? 5 : 3} />
      <circle cx="300" cy="320" r="46" fill="var(--gp-peach)" opacity="0.85" />
      <circle cx="300" cy="320" r="20" fill="var(--gp-surface)" stroke="var(--gp-copper)" strokeOpacity="0.5" strokeWidth="2" />
      {TREES.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y + 5} r="15" fill="var(--gp-ink)" opacity="0.12" />
          <circle cx={x} cy={y} r="15" fill="var(--gp-primary)" opacity="0.78" />
          <circle cx={x - 4} cy={y - 4} r="7" fill="var(--gp-surface)" opacity="0.14" />
        </g>
      ))}

      {/* entrance */}
      <path d="M232 600v-44h136v44" fill="var(--gp-surface)" stroke="var(--gp-copper)" strokeOpacity={activeId === "entrance" ? 1 : 0.35} strokeWidth={activeId === "entrance" ? 4 : 2} />
      {[566, 574, 582, 590].map((y) => <line key={y} x1="240" x2="360" y1={y} y2={y} stroke="var(--gp-copper)" strokeOpacity="0.4" />)}
      <circle cx="300" cy="530" r="34" fill="none" stroke="var(--gp-copper)" strokeOpacity="0.55" strokeWidth="2" />
      <text x="300" y="540" textAnchor="middle" fontFamily="var(--gp-font-display)" fontStyle="italic" fontSize="28" fill="var(--gp-copper)" opacity="0.8">Gp</text>

      {/* nothing is drawn at PLAN_POSITIONS — the numbered markers are real HTML links laid over this art by MallDirectory */}
      <desc>{Object.keys(PLAN_POSITIONS).join(", ")}</desc>
    </svg>
  );
}

import { GiftBoxShape, type BoxTone } from "@/components/art/GiftBoxArt";

/**
 * The homepage hero, drawn in code: a warm-lit gifting-mall atrium — a glowing skylight, curved balconies, strings of fairy lights, glowing shopfront arches,
 * gift boxes hanging on ribbons and a central platform piled with gifts and flowers. It is a PLACEHOLDER for the client's photographic hero
 * (lib/content/imagery.ts "hero-atrium"), and every colour is a theme token so a festival theme re-lights it. The left third is deliberately calm: the headline sits there.
 */

// deterministic pseudo-random so server and client render the same lights
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const HANGING: { x: number; len: number; scale: number; tone: BoxTone; delay: number }[] = [
  { x: 800, len: 150, scale: 0.62, tone: "copper", delay: 0 },
  { x: 930, len: 250, scale: 0.8, tone: "peach", delay: 1.6 },
  { x: 1060, len: 120, scale: 0.55, tone: "green", delay: 0.8 },
  { x: 1180, len: 300, scale: 0.9, tone: "copper", delay: 2.4 },
  { x: 1310, len: 180, scale: 0.68, tone: "ivory", delay: 3.2 },
  { x: 1430, len: 260, scale: 0.78, tone: "green", delay: 1.1 },
  { x: 1540, len: 130, scale: 0.5, tone: "peach", delay: 2.0 },
];

const PLATFORM_GIFTS: { x: number; y: number; s: number; tone: BoxTone }[] = [
  { x: 990, y: 520, s: 0.62, tone: "green" },
  { x: 1220, y: 512, s: 0.66, tone: "copper" },
  { x: 1080, y: 470, s: 0.78, tone: "peach" },
  { x: 1160, y: 440, s: 0.9, tone: "green" },
  { x: 1300, y: 526, s: 0.56, tone: "ivory" },
];

export function AtriumScene({ className }: { className?: string }) {
  const rand = rng(7);
  const lights = Array.from({ length: 78 }, (_, i) => {
    const row = i % 3;
    const t = (i / 78) * 3 - Math.floor((i / 78) * 3);
    const x = 470 + t * 1130;
    const sag = 34 + row * 16;
    const y = 96 + row * 92 + Math.sin(t * Math.PI * 4) * sag * 0.5 + rand() * 6;
    return { x, y, r: 1.6 + rand() * 1.6, halo: 6 + rand() * 6 };
  });
  const bokeh = Array.from({ length: 26 }, () => ({ x: 560 + rand() * 1040, y: 60 + rand() * 520, r: 10 + rand() * 26, o: 0.05 + rand() * 0.12 }));

  return (
    <svg viewBox="0 0 1600 720" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="A warmly lit gifting mall atrium with hanging gift boxes" focusable="false">
      <defs>
        <linearGradient id="atr-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gp-primary-dark)" />
          <stop offset="0.5" stopColor="var(--gp-primary)" />
          <stop offset="1" stopColor="var(--gp-copper-dark)" stopOpacity="0.85" />
        </linearGradient>
        <radialGradient id="atr-sky" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--gp-peach)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--gp-copper)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--gp-copper)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="atr-arch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gp-peach)" stopOpacity="0.95" />
          <stop offset="1" stopColor="var(--gp-copper)" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="atr-floor" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--gp-copper-dark)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--gp-primary-dark)" />
        </linearGradient>
        <radialGradient id="atr-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--gp-peach)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--gp-peach)" stopOpacity="0" />
        </radialGradient>
        <filter id="atr-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="atr-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" /></filter>
      </defs>

      <rect width="1600" height="720" fill="url(#atr-wall)" />

      {/* skylight */}
      <ellipse cx="1090" cy="40" rx="420" ry="190" fill="url(#atr-sky)" />
      <g stroke="var(--gp-peach)" strokeOpacity="0.25" fill="none" strokeWidth="2">
        {Array.from({ length: 9 }, (_, i) => <path key={i} d={`M${1090 - 380 + i * 95} -10 Q1090 ${170 + Math.abs(4 - i) * 6} ${1090 - 380 + i * 95 + (i - 4) * 30} 190`} />)}
        <ellipse cx="1090" cy="40" rx="330" ry="120" />
      </g>

      {/* balconies */}
      <path d="M520 214c260 24 700 24 1100 0v54c-400 24-840 24-1100 0z" fill="var(--gp-primary-dark)" opacity="0.85" />
      <path d="M470 366c300 30 760 30 1130 0v58c-400 28-830 28-1130 0z" fill="var(--gp-primary-dark)" opacity="0.9" />
      <g stroke="var(--gp-peach)" strokeOpacity="0.18" strokeWidth="2">
        {Array.from({ length: 34 }, (_, i) => <line key={i} x1={545 + i * 32} y1={232 + Math.sin(i / 5) * 4} x2={545 + i * 32} y2={262} />)}
      </g>

      {/* hanging plants on the balconies */}
      {[700, 860, 1010, 1160, 1320, 1470].map((x, i) => (
        <g key={x} opacity="0.85">
          <path d={`M${x} 262c-16 40-10 84-${i % 2 ? 4 : 12} 110`} stroke="var(--gp-primary)" strokeWidth="9" strokeLinecap="round" fill="none" />
          <path d={`M${x + 14} 262c12 30 8 66 ${i % 2 ? 10 : 2} 96`} stroke="var(--gp-primary)" strokeWidth="7" strokeLinecap="round" fill="none" />
        </g>
      ))}

      {/* shopfront arches, glowing */}
      {[770, 905, 1040, 1175, 1310, 1445].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 600v-${140 + (i % 2) * 14}a58 58 0 0 1 116 0v${140 + (i % 2) * 14}z`} fill="url(#atr-arch)" opacity="0.92" />
          <path d={`M${x + 12} 600v-${120 + (i % 2) * 14}a46 46 0 0 1 92 0v${120 + (i % 2) * 14}z`} fill="none" stroke="var(--gp-primary-dark)" strokeOpacity="0.55" strokeWidth="3" />
          {[520, 552, 584].map((y) => <rect key={y} x={x + 16} y={y - (i % 2) * 14} width="84" height="6" rx="3" fill="var(--gp-primary-dark)" opacity="0.32" />)}
          {[0, 1, 2].map((k) => <rect key={k} x={x + 22 + k * 26} y={506 - (i % 2) * 14 + k * 4} width="16" height="22" rx="4" fill="var(--gp-primary-dark)" opacity="0.28" />)}
        </g>
      ))}

      {/* big soft bokeh */}
      <g filter="url(#atr-blur)">
        {bokeh.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="var(--gp-peach)" opacity={b.o} />)}
      </g>

      {/* fairy lights */}
      <g>
        {lights.map((l, i) => (
          <g key={i}>
            <circle cx={l.x} cy={l.y} r={l.halo} fill="var(--gp-peach)" opacity="0.2" filter="url(#atr-soft)" />
            <circle cx={l.x} cy={l.y} r={l.r} fill="var(--gp-peach)" opacity="0.95" />
          </g>
        ))}
      </g>

      {/* floor + reflections */}
      <rect y="600" width="1600" height="120" fill="url(#atr-floor)" />
      <ellipse cx="1180" cy="690" rx="420" ry="34" fill="url(#atr-glow)" />

      {/* central platform */}
      <ellipse cx="1150" cy="596" rx="290" ry="58" fill="var(--gp-primary-dark)" opacity="0.55" />
      <ellipse cx="1150" cy="582" rx="270" ry="48" fill="var(--gp-peach)" opacity="0.94" />
      <ellipse cx="1150" cy="578" rx="236" ry="38" fill="var(--gp-surface)" opacity="0.7" />
      {PLATFORM_GIFTS.map((g, i) => (
        <g key={i} transform={`translate(${g.x} ${g.y}) scale(${g.s})`}><GiftBoxShape tone={g.tone} /></g>
      ))}
      {/* flowers */}
      {[1010, 1100, 1250, 1330].map((x, i) => (
        <g key={x} transform={`translate(${x} ${548 - (i % 2) * 8})`}>
          <path d="M0 40c-4-24-8-40 0-60" stroke="var(--gp-primary)" strokeWidth="3" fill="none" />
          {[[-12, -26], [10, -30], [0, -46], [-16, -44], [14, -46]].map(([dx, dy], k) => <circle key={k} cx={dx} cy={dy} r={10 - (k % 2) * 2} fill={k % 2 ? "var(--gp-copper)" : "var(--gp-peach)"} />)}
        </g>
      ))}

      {/* hanging gifts — they float, slowly */}
      {HANGING.map((h) => (
        <g key={h.x} transform={`translate(${h.x} 0)`}>
          <g className="float-slow" style={{ animationDelay: `${h.delay}s` }}>
            <line x1="0" y1="0" x2="0" y2={h.len} stroke="var(--gp-peach)" strokeOpacity="0.55" strokeWidth="2" />
            <g transform={`translate(${-60 * h.scale} ${h.len - 8}) scale(${h.scale})`}><GiftBoxShape tone={h.tone} /></g>
          </g>
        </g>
      ))}

      {/* foreground plants framing the scene */}
      <g opacity="0.92">
        <ellipse cx="690" cy="596" rx="46" ry="12" fill="var(--gp-primary-dark)" opacity="0.6" />
        {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={672 + i * 11} cy={520 - (i % 3) * 30} rx="26" ry="60" transform={`rotate(${-24 + i * 12} ${690} 596)`} fill="var(--gp-primary)" opacity="0.9" />)}
        <ellipse cx="1575" cy="596" rx="46" ry="12" fill="var(--gp-primary-dark)" opacity="0.6" />
        {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={1557 + i * 11} cy={520 - (i % 3) * 30} rx="26" ry="60" transform={`rotate(${-24 + i * 12} 1575 596)`} fill="var(--gp-primary)" opacity="0.9" />)}
      </g>
    </svg>
  );
}

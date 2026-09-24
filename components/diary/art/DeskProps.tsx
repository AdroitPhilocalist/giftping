import { Sprig } from "./Sprig";

/**
 * The things lying around the book, drawn in SVG and shown a little out of focus at the edges of the desk (the depth of field in the reference
 * screens). Wide screens only — on a phone the book is the whole picture. Pure decoration: aria-hidden and pointer-events none.
 */
function Petals({ cx, cy, r, n, ring, fill }: { cx: number; cy: number; r: number; n: number; ring: number; fill: string }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2;
        return <circle key={i} cx={cx + Math.cos(a) * ring} cy={cy + Math.sin(a) * ring} r={r} fill={fill} />;
      })}
    </g>
  );
}

export function DeskProps() {
  return (
    <div className="dy-props" aria-hidden="true">
      {/* brass plate with marigolds and daisies — top left */}
      <svg className="dy-prop" style={{ left: "-4.5rem", top: "-3rem", width: "17rem" }} viewBox="0 0 240 240">
        <circle cx="120" cy="120" r="112" fill="var(--dy-brass)" />
        <circle cx="120" cy="120" r="100" fill="var(--dy-gold)" opacity="0.7" />
        <circle cx="120" cy="120" r="82" fill="var(--dy-brass)" />
        <circle cx="120" cy="120" r="70" fill="none" stroke="var(--dy-foil-lo)" strokeWidth="2" opacity="0.6" strokeDasharray="3 6" />
        <Petals cx={120} cy={120} r={20} n={9} ring={38} fill="var(--dy-flame)" />
        <Petals cx={120} cy={120} r={14} n={7} ring={28} fill="var(--dy-mustard)" />
        <circle cx="120" cy="120" r="16" fill="var(--dy-gold)" />
        <Petals cx={72} cy={66} r={7} n={8} ring={14} fill="var(--dy-petal)" />
        <circle cx="72" cy="66" r="6" fill="var(--dy-gold)" />
        <Petals cx={168} cy={170} r={7} n={8} ring={14} fill="var(--dy-petal)" />
        <circle cx="168" cy="170" r="6" fill="var(--dy-gold)" />
      </svg>
      {/* a cup of chai on a saucer — left edge */}
      <svg className="dy-prop" style={{ left: "-5.5rem", top: "15rem", width: "14rem" }} viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="92" fill="var(--dy-paper-lo)" />
        <circle cx="100" cy="100" r="84" fill="var(--dy-paper-hi)" />
        <circle cx="100" cy="100" r="58" fill="var(--dy-paper-hi)" stroke="var(--dy-paper-edge)" strokeWidth="3" />
        <circle cx="100" cy="100" r="50" fill="var(--dy-tea)" />
        <circle cx="100" cy="100" r="50" fill="none" stroke="var(--dy-foil)" strokeWidth="3" />
        <ellipse cx="88" cy="88" rx="26" ry="14" fill="var(--dy-apricot)" opacity="0.55" />
        <path d="M156 92c22 0 28 30 6 36" fill="none" stroke="var(--dy-paper-edge)" strokeWidth="9" strokeLinecap="round" />
        <path d="M70 30q6 4 10 0m20-2q6 4 10 0" fill="none" stroke="var(--dy-leaf)" strokeWidth="2" opacity="0.6" />
      </svg>
      {/* bottom-left: a few sprigs loose on the wood */}
            <div className="dy-prop" style={{ left: "1rem", bottom: "1rem", width: "5rem", transform: "rotate(-24deg)" }}><Sprig variant="wild" /></div>
      <div className="dy-prop" style={{ left: "6rem", bottom: "-1rem", width: "4rem", transform: "rotate(18deg)" }}><Sprig variant="daisy" /></div>
      {/* a fountain pen — right edge */}
      <svg className="dy-prop" style={{ right: "-2rem", top: "22rem", width: "22rem", transform: "rotate(74deg)" }} viewBox="0 0 400 40">
        <rect x="20" y="10" width="290" height="20" rx="10" fill="var(--dy-pen)" />
        <rect x="24" y="12" width="282" height="5" rx="2.5" fill="var(--dy-petal)" opacity="0.14" />
        <rect x="150" y="9" width="8" height="22" fill="var(--dy-gold)" />
        <rect x="292" y="8" width="12" height="24" rx="3" fill="var(--dy-gold)" />
        <path d="M304 12l60 6q10 2 0 4l-60 6z" fill="var(--dy-foil)" />
        <path d="M304 20h60" stroke="var(--dy-foil-lo)" strokeWidth="1.5" />
        <rect x="250" y="12" width="6" height="16" fill="var(--dy-gold)" />
      </svg>
      {/* bottom right: a small stack of books */}
      <svg className="dy-prop" style={{ right: "-3.5rem", bottom: "-1rem", width: "17rem" }} viewBox="0 0 260 150">
        <rect x="14" y="88" width="230" height="50" rx="5" fill="var(--dy-ribbon)" />
        <rect x="14" y="88" width="230" height="10" rx="5" fill="var(--dy-ribbon-hi)" opacity="0.5" />
        <rect x="26" y="98" width="212" height="6" fill="var(--dy-paper-hi)" />
        <rect x="34" y="40" width="200" height="48" rx="5" fill="var(--dy-leaf-lo)" />
        <rect x="34" y="40" width="200" height="9" rx="4" fill="var(--dy-leaf)" opacity="0.6" />
        <rect x="46" y="50" width="188" height="5" fill="var(--dy-paper-hi)" opacity="0.8" />
        <path d="M60 64h150M60 72h110" stroke="var(--dy-foil)" strokeWidth="2.2" opacity="0.8" />
        <rect x="60" y="6" width="176" height="36" rx="5" fill="var(--dy-mustard)" />
        <rect x="70" y="14" width="160" height="5" fill="var(--dy-paper-hi)" opacity="0.7" />
      </svg>
    </div>
  );
}

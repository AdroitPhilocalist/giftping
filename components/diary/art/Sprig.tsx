import { cn } from "@/lib/utils/cn";
import "../diary-tokens.css";

/**
 * Hand-drawn florals for the diary's margins: small, light, and coloured from the diary's own variables (see diary.css), so they cost no image
 * download and sit on any page. Purely decorative (aria-hidden). A festival theme can re-tint them by overriding --dy-* variables.
 */
export type SprigVariant = "daisy" | "wild" | "leaf" | "marigold";

function Leaf({ x, y, r, s = 1, fill = "var(--dy-leaf)" }: { x: number; y: number; r: number; s?: number; fill?: string }) {
  return <path d="M0 0C5-7 15-8 22 0C15 8 5 7 0 0Z" fill={fill} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`} />;
}

function Daisy({ x, y, r, petals = 9, tilt = 0 }: { x: number; y: number; r: number; petals?: number; tilt?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt})`}>
      {Array.from({ length: petals }, (_, i) => (
        <ellipse key={i} cx={r * 0.62} cy={0} rx={r * 0.44} ry={r * 0.2} transform={`rotate(${(i * 360) / petals})`} fill="var(--dy-petal)" stroke="var(--dy-paper-edge)" strokeWidth={0.5} />
      ))}
      <circle r={r * 0.3} fill="var(--dy-gold)" />
      <circle r={r * 0.12} cx={-r * 0.06} cy={-r * 0.06} fill="var(--dy-flame)" opacity={0.7} />
    </g>
  );
}

function Blossom({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx={0} cy={-r * 0.62} r={r * 0.48} transform={`rotate(${i * 72})`} fill={fill} />
      ))}
      <circle r={r * 0.26} fill="var(--dy-gold)" />
    </g>
  );
}

function Pompom({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={0} cy={-r * 0.7} r={r * 0.36} transform={`rotate(${i * 30})`} fill="var(--dy-flame)" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} cx={0} cy={-r * 0.4} r={r * 0.3} transform={`rotate(${i * 45 + 20})`} fill="var(--dy-gold)" />
      ))}
      <circle r={r * 0.22} fill="var(--dy-brass)" />
    </g>
  );
}

const stem = { fill: "none", stroke: "var(--dy-leaf-lo)", strokeWidth: 2.3, strokeLinecap: "round" as const };

export function Sprig({ variant = "daisy", className, flip = false }: { variant?: SprigVariant; className?: string; flip?: boolean }) {
  return (
    <svg viewBox="0 0 100 200" aria-hidden="true" focusable="false" className={cn("pointer-events-none select-none", className)} style={flip ? { transform: "scaleX(-1)" } : undefined}>
      {variant === "daisy" ? (
        <>
          <path d="M50 198C45 150 57 108 44 54" {...stem} />
          <path d="M49 152C60 140 70 128 74 112" {...stem} strokeWidth={1.8} />
          <path d="M47 122C38 110 30 102 28 88" {...stem} strokeWidth={1.8} />
          <Leaf x={48} y={176} r={-38} s={1.15} />
          <Leaf x={49} y={158} r={-142} s={1} fill="var(--dy-leaf-lo)" />
          <Leaf x={48} y={140} r={-34} s={0.95} />
          <Leaf x={47} y={104} r={-146} s={0.9} fill="var(--dy-leaf-lo)" />
          <Leaf x={46} y={84} r={-40} s={0.8} />
          <Daisy x={44} y={44} r={17} tilt={-10} />
          <Daisy x={75} y={104} r={12.5} tilt={20} />
          <Daisy x={28} y={80} r={11} tilt={5} />
          <circle cx={62} cy={62} r={3.2} fill="var(--dy-petal)" stroke="var(--dy-paper-edge)" strokeWidth={0.5} />
        </>
      ) : null}
      {variant === "wild" ? (
        <>
          <path d="M58 198C40 152 62 112 44 72S46 22 50 8" {...stem} strokeWidth={2} />
          <path d="M52 110C64 100 70 90 68 76" {...stem} strokeWidth={1.6} />
          <path d="M46 146C36 136 30 126 32 112" {...stem} strokeWidth={1.6} />
          <Leaf x={54} y={176} r={-30} s={0.95} />
          <Leaf x={50} y={150} r={-150} s={0.85} fill="var(--dy-leaf-lo)" />
          <Leaf x={51} y={100} r={-25} s={0.8} />
          <Leaf x={44} y={66} r={-150} s={0.75} fill="var(--dy-leaf-lo)" />
          <Blossom x={50} y={14} r={9} fill="var(--dy-mustard)" />
          <Blossom x={69} y={70} r={8} fill="var(--dy-apricot)" />
          <Blossom x={33} y={104} r={8.5} fill="var(--dy-blush)" />
          <Blossom x={42} y={44} r={6.5} fill="var(--dy-apricot)" />
          <circle cx={58} cy={132} r={3.4} fill="var(--dy-mustard)" />
        </>
      ) : null}
      {variant === "leaf" ? (
        <>
          <path d="M50 198C52 150 46 100 52 10" {...stem} strokeWidth={2} />
          {[178, 152, 126, 100, 74, 48].map((y, i) => (
            <g key={y}>
              <ellipse cx={i % 2 ? 66 : 34} cy={y} rx={12 - i * 0.7} ry={6.4 - i * 0.4} transform={`rotate(${i % 2 ? -28 : 28} ${i % 2 ? 66 : 34} ${y})`} fill={i % 3 === 0 ? "var(--dy-leaf-lo)" : "var(--dy-leaf)"} opacity={0.92} />
            </g>
          ))}
          <ellipse cx={52} cy={14} rx={5} ry={9} fill="var(--dy-leaf)" />
        </>
      ) : null}
      {variant === "marigold" ? (
        <>
          <path d="M50 198C44 156 56 112 46 70" {...stem} />
          <path d="M49 148C62 136 72 124 74 108" {...stem} strokeWidth={1.8} />
          <Leaf x={48} y={176} r={-34} s={1.1} />
          <Leaf x={49} y={152} r={-146} s={1} fill="var(--dy-leaf-lo)" />
          <Leaf x={48} y={128} r={-30} s={0.9} />
          <Pompom x={46} y={58} r={20} />
          <Pompom x={74} y={98} r={14} />
        </>
      ) : null}
    </svg>
  );
}

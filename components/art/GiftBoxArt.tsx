import { cn } from "@/lib/utils/cn";

export type BoxTone = "green" | "copper" | "peach" | "ivory";

// Box body colour + ribbon colour per tone — all theme tokens, so a festival theme recolours every gift in the mall.
const TONES: Record<BoxTone, { box: string; lid: string; ribbon: string }> = {
  green: { box: "var(--gp-primary)", lid: "var(--gp-primary-dark)", ribbon: "var(--gp-copper)" },
  copper: { box: "var(--gp-copper)", lid: "var(--gp-copper-dark)", ribbon: "var(--gp-peach)" },
  peach: { box: "var(--gp-peach)", lid: "var(--gp-surface)", ribbon: "var(--gp-copper)" },
  ivory: { box: "var(--gp-surface)", lid: "var(--gp-peach)", ribbon: "var(--gp-primary)" },
};

/** The gift-box drawing as a bare <g> in a 120×130 box, so scenes can place many of them. */
export function GiftBoxShape({ tone = "green" }: { tone?: BoxTone }) {
  const c = TONES[tone];
  return (
    <g>
      <ellipse cx="60" cy="124" rx="46" ry="5" fill="var(--gp-ink)" opacity="0.14" />
      <rect x="16" y="56" width="88" height="64" rx="4" fill={c.box} />
      <rect x="16" y="56" width="88" height="10" fill="var(--gp-ink)" opacity="0.1" />
      <rect x="9" y="36" width="102" height="26" rx="4" fill={c.lid} />
      <rect x="9" y="36" width="102" height="6" rx="3" fill="var(--gp-surface)" opacity="0.18" />
      {/* ribbon */}
      <rect x="53" y="36" width="14" height="84" fill={c.ribbon} />
      <rect x="53" y="36" width="5" height="84" fill="var(--gp-surface)" opacity="0.22" />
      {/* bow */}
      <path d="M60 36c-6-20-30-26-34-14s16 20 34 14z" fill={c.ribbon} />
      <path d="M60 36c6-20 30-26 34-14s-16 20-34 14z" fill={c.ribbon} />
      <path d="M60 36c-6-20-30-26-34-14s16 20 34 14z" fill="var(--gp-ink)" opacity="0.1" />
      <ellipse cx="60" cy="36" rx="8" ry="7" fill={c.ribbon} />
      <ellipse cx="58" cy="34" rx="3" ry="2.4" fill="var(--gp-surface)" opacity="0.35" />
    </g>
  );
}

export function GiftBoxArt({ tone = "green", className, title }: { tone?: BoxTone; className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 120 130" className={cn("h-auto w-full", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <GiftBoxShape tone={tone} />
    </svg>
  );
}

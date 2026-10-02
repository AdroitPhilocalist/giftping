import { useId } from "react";
import { GiftBoxShape, type BoxTone } from "@/components/art/GiftBoxArt";
import { cn } from "@/lib/utils/cn";

/**
 * A woven gifting basket, drawn in code, theme tokens throughout — the client asked for the cart to feel
 * like a real basket the shopper is "planting gifts into," rather than a plain list. Used at the top of the
 * cart page (full, with gifts peeking over the rim) and in the empty-cart state (`full={false}`, nothing
 * inside yet, waiting).
 */
export function BasketWeaveDefs({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="14" stroke="var(--gp-copper-dark)" strokeOpacity="0.35" strokeWidth="3" />
        <line x1="7" y1="0" x2="7" y2="14" stroke="var(--gp-peach)" strokeOpacity="0.5" strokeWidth="3" />
      </pattern>
    </defs>
  );
}

/** The handle — drawn BEHIND whatever is in the basket. */
export function BasketHandle() {
  return (
    <>
      <path d="M52 78C52 40 74 18 100 18s48 22 48 60" fill="none" stroke="var(--gp-copper-dark)" strokeWidth="7" strokeLinecap="round" />
      <path d="M52 78C52 40 74 18 100 18s48 22 48 60" fill="none" stroke="var(--gp-copper)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    </>
  );
}

/** The woven body, rim and ground shadow — drawn IN FRONT of the contents so they look tucked inside. */
export function BasketBody({ weaveId }: { weaveId: string }) {
  return (
    <>
      <path d="M18 82h164l-14 78a10 10 0 0 1-9.8 8H41.8a10 10 0 0 1-9.8-8z" fill="var(--gp-copper)" />
      <path d="M18 82h164l-14 78a10 10 0 0 1-9.8 8H41.8a10 10 0 0 1-9.8-8z" fill={`url(#${weaveId})`} />
      <path d="M18 82h164l-3.2 18H21.2z" fill="var(--gp-copper-dark)" />
      <ellipse cx="100" cy="82" rx="82" ry="11" fill="var(--gp-peach)" />
      <ellipse cx="100" cy="82" rx="82" ry="11" fill="none" stroke="var(--gp-copper-dark)" strokeWidth="2.5" opacity="0.5" />
      {/* a soft ground shadow */}
      <ellipse cx="100" cy="168" rx="70" ry="6" fill="var(--gp-ink)" opacity="0.08" />
    </>
  );
}

export function BasketArt({ className, full = true, title }: { className?: string; full?: boolean; title?: string }) {
  const weaveId = useId();
  const gifts: { x: number; y: number; s: number; tone: BoxTone }[] = [
    { x: 34, y: 8, s: 0.42, tone: "green" },
    { x: 86, y: -4, s: 0.5, tone: "copper" },
    { x: 128, y: 10, s: 0.4, tone: "peach" },
  ];
  return (
    <svg viewBox="0 0 200 172" className={cn("h-auto w-full", className)} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true} focusable="false">
      <BasketWeaveDefs id={weaveId} />
      <BasketHandle />

      {/* gifts peeking over the rim, only when the basket has something in it */}
      {full ? gifts.map((g, i) => (
        <g key={i} transform={`translate(${g.x} ${g.y}) scale(${g.s})`}><GiftBoxShape tone={g.tone} /></g>
      )) : null}

      <BasketBody weaveId={weaveId} />
    </svg>
  );
}

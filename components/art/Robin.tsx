import Image from "next/image";
import { siteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";

export type RobinPose = "perched" | "flying-gift" | "on-gift" | "peeking" | "waving" | "heart" | "search" | "bell" | "celebrating" | "reading" | "sleeping";

/** True once the client's illustration of this pose exists (so a caller can drop the drawn gift box it would otherwise sit beside). */
export const hasRobinArt = (pose: RobinPose) => siteImage(`robin-${pose}`) !== null;

/**
 * The GiftPing robin. Shows the client's illustrated mascot in the requested pose (robin-perched / -flying-gift / -on-gift / -peeking in lib/content/imagery.ts)
 * and falls back to a code-drawn robin until that pose is delivered — the drawing's colours are theme tokens, so it follows a festival theme.
 * Usage: perched = default; flying-gift = something is on its way; on-gift = celebrating; peeking = empty states.
 */
export function Robin({ className, title = "The GiftPing robin", pose = "perched", priority = false }: { className?: string; title?: string; pose?: RobinPose; priority?: boolean }) {
  // a pose that has not been delivered yet falls back to the perched robin (real art) before falling back to the drawing
  const img = siteImage(`robin-${pose}`) ?? siteImage("robin-perched");
  if (img) {
    return <Image src={img.src} alt={title} width={img.width} height={img.height} sizes="240px" priority={priority} className={cn("h-auto w-full", className)} />;
  }
  return (
    <svg viewBox="0 0 200 190" className={cn("h-auto w-full", className)} role="img" aria-label={title}>
      {/* twig + leaves */}
      <path d="M8 168c40-8 88-6 130-2 24 2 42 8 54 18" fill="none" stroke="var(--gp-copper-dark)" strokeWidth="5" strokeLinecap="round" />
      <path d="M48 165c-8-14-4-28 8-34 4 12 2 26-8 34z" fill="var(--gp-primary)" opacity="0.85" />
      <path d="M150 166c10-12 26-14 36-6-8 10-24 14-36 6z" fill="var(--gp-primary)" opacity="0.85" />
      <path d="M96 165c-2-12 6-24 18-26 0 12-6 22-18 26z" fill="var(--gp-primary)" opacity="0.7" />
      {/* tail */}
      <path d="M150 112l42 30c4 3 2 9-3 8l-52-12z" fill="var(--gp-copper-dark)" />
      {/* legs */}
      <path d="M92 150v18M112 150v18" stroke="var(--gp-ink)" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      {/* body */}
      <ellipse cx="100" cy="112" rx="56" ry="46" fill="var(--gp-copper-dark)" />
      <path d="M62 112c0-26 12-48 34-52 26 0 44 18 44 46 0 26-18 46-44 46-22 0-34-16-34-40z" fill="var(--gp-peach)" opacity="0.95" />
      {/* head */}
      <circle cx="74" cy="72" r="34" fill="var(--gp-copper-dark)" />
      {/* the breast: the robin's signature */}
      <path d="M46 78c4-22 22-34 40-30 16 4 26 20 24 40-2 22-14 40-30 50-18-6-32-30-34-60z" fill="var(--gp-copper)" />
      <path d="M52 92c10-6 26-4 34 6" fill="none" stroke="var(--gp-surface)" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
      {/* wing */}
      <path d="M112 84c26 4 42 26 34 50-12 6-32 4-46-8-10-14-8-34 12-42z" fill="var(--gp-copper-dark)" />
      <path d="M118 96c14 4 22 16 20 28" fill="none" stroke="var(--gp-ink)" strokeWidth="2" opacity="0.25" strokeLinecap="round" />
      {/* face */}
      <circle cx="62" cy="66" r="4.4" fill="var(--gp-ink)" />
      <circle cx="60.6" cy="64.6" r="1.4" fill="var(--gp-surface)" />
      <path d="M40 74l-20 6 20 6z" fill="var(--gp-ink)" opacity="0.85" />
    </svg>
  );
}

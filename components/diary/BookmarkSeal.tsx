import { Lock } from "lucide-react";
import { HeartDoodle } from "./art/Doodles";
import { WaxSeal } from "./art/WaxSeal";

/**
 * "Only you can open this": a ribbon hanging from the top of the page ending in a wax seal with a padlock, and a torn tag. It is the diary's
 * privacy promise made visible — not even GiftPing's team can read a diary (see the RLS notes in CLAUDE.md).
 */
export function BookmarkSeal({ className }: { className?: string }) {
  return (
    <div className={className} style={{ position: "absolute", right: "0", top: "-2.6rem", width: "13.6rem", height: "11rem", zIndex: 6 }}>
      <span className="dy-ribbon" style={{ left: "1.55rem", top: 0 }} aria-hidden="true" />
      <WaxSeal size={82} animate className="!absolute z-[5]" >
        <Lock className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
      </WaxSeal>
      <div className="dy-note dy-note--peach dy-hand text-center text-[1.3rem] leading-[1.05]" style={{ position: "absolute", left: "5rem", top: "4.3rem", zIndex: 5, width: "8.5rem", ["--tilt" as string]: "-4deg", ["--torn" as string]: "var(--dy-torn-3)" }}>
        Only you can<br />open this <HeartDoodle className="ml-0.5" />
      </div>
    </div>
  );
}

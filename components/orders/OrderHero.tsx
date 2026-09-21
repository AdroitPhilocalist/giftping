import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { HeroBackdrop } from "@/components/art/HeroBackdrop";
import { Robin, hasRobinArt, type RobinPose } from "@/components/art/Robin";
import type { SiteImage } from "@/lib/content/imagery";
import { Jaali } from "@/components/ornaments/Jaali";
import { Badge } from "@/components/ui/Badge";
import type { OrderProgress } from "@/lib/shop/order-progress";
import { cn } from "@/lib/utils/cn";

/** The top of the tracking page: a warm banner that says, in one line, where the gift is — with the robin keeping an eye on it. */
export function OrderHero({ orderNumber, placedOn, statusLabel, progress, backdrop, children }: { backdrop?: SiteImage | null; orderNumber: string; placedOn: string; statusLabel: string; progress: OrderProgress; children?: React.ReactNode }) {
  const cancelled = progress.tone === "cancelled";
  const pose: RobinPose = progress.tone === "done" ? "on-gift" : progress.tone === "progress" ? "flying-gift" : "perched";
  return (
    <section className={cn("relative overflow-hidden rounded-card border", cancelled ? "border-red-200 bg-red-50" : "border-brand-secondary/20 bg-gradient-to-br from-brand-accent via-brand-surface to-brand-accent")}>
      {cancelled ? null : backdrop ? <HeroBackdrop image={backdrop} className="w-[55%]" /> : <Jaali className="opacity-[0.08]" />}
      <div className="relative grid items-center gap-6 px-6 py-8 sm:px-10 sm:py-10 md:grid-cols-[minmax(0,1fr)_auto]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className={cn("text-[11px] font-medium uppercase tracking-[0.28em]", cancelled ? "text-red-900" : "text-brand-secondary-dark")}>{progress.eyebrow}</p>
            <Badge variant={progress.tone === "waiting" ? "gold" : "primary"}>{statusLabel}</Badge>
          </div>
          <h1 className={cn("mt-3 font-heading text-3xl leading-tight sm:text-4xl", cancelled ? "text-red-950" : "text-brand-dark")}>{progress.headline}</h1>
          {progress.subline ? <p className={cn("mt-3 max-w-xl text-sm leading-relaxed sm:text-base", cancelled ? "text-red-900/80" : "text-brand-dark/70")}>{progress.subline}</p> : null}
          <p className="mt-4 text-xs text-brand-dark/55">
            Order <span className="font-medium text-brand-dark">{orderNumber}</span> · placed {placedOn}
          </p>
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        {cancelled || backdrop ? null : (
          <div className="hidden items-end gap-2 md:flex" aria-hidden="true">
            {hasRobinArt(pose) ? (
              <Robin pose={pose} className="float-slow w-40" />
            ) : (
              <>
                <Robin className="float-slow w-24" />
                <GiftBoxArt tone={progress.tone === "done" ? "copper" : "green"} className="-ml-4 w-28" />
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

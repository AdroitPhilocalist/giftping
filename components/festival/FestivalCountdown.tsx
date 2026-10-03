import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { countdownLine, festivalCountdown, festivalForTheme, todayInIndia } from "@/lib/festivals/calendar";
import { cn } from "@/lib/utils/cn";

/**
 * "36 days to Diwali — order by 4 Nov for Diwali delivery." Shown only while a festival's theme is the live one (`themeId`), from the shop's own India date.
 * `variant="ribbon"` is the homepage band with a shop button; `"note"` is the quiet one-liner for the cart. Renders nothing when there is no festival or
 * the calendar has run out — a missing countdown must never break a page. The days are worked out when the page renders (pages that read the session are
 * dynamic, so it is current to the day).
 */
export function FestivalCountdown({ themeId, variant = "ribbon" }: { themeId: string; variant?: "ribbon" | "note" }) {
  const festival = festivalForTheme(themeId);
  const countdown = festival ? festivalCountdown(festival, todayInIndia()) : null;
  if (!festival || !countdown) return null;
  const { headline, detail } = countdownLine(countdown);
  const urgent = countdown.phase === "last-chance";
  const late = countdown.phase === "cutoff-passed";

  if (variant === "note") {
    return (
      <p className={cn("flex items-start gap-2 rounded-card border px-4 py-3 text-sm", urgent ? "border-brand-secondary/50 bg-brand-accent text-brand-dark" : "border-brand-dark/10 bg-brand-surface text-brand-dark/75")}>
        <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" />
        <span><strong className="font-medium text-brand-dark">{headline}.</strong> {detail}</span>
      </p>
    );
  }
  return (
    <section aria-label={`${festival.name} countdown`} className="gp-festival-ribbon relative overflow-hidden bg-brand-primary text-brand-on-primary">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
        <div className="flex items-center gap-4">
          <span className="gp-festival-days hidden shrink-0 sm:grid" aria-hidden="true">
            <span className="font-heading text-2xl leading-none">{countdown.phase === "festival-day" ? "🪔" : countdown.daysToFestival}</span>
            {countdown.phase === "festival-day" ? null : <span className="text-[9px] uppercase tracking-[0.18em]">{countdown.daysToFestival === 1 ? "day" : "days"}</span>}
          </span>
          <div>
            <p className="font-heading text-lg leading-tight sm:text-xl">{festival.greeting} <span className="gp-festival-gold">— {headline}</span></p>
            <p className={cn("mt-0.5 text-sm", late ? "text-brand-on-primary/65" : "text-brand-on-primary/85", urgent && "gp-festival-gold font-medium")}>{detail}</p>
          </div>
        </div>
        <Link href={festival.shopHref} className="shrink-0 rounded-full bg-brand-secondary px-5 py-2 text-sm font-medium text-brand-on-secondary shadow-card transition-transform duration-300 hover:-translate-y-0.5">Shop {festival.name} gifts</Link>
      </div>
    </section>
  );
}

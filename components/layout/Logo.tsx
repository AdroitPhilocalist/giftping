import Image from "next/image";
import Link from "next/link";
import { Bird } from "lucide-react";
import { siteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";

/**
 * The GiftPing mark: the client's "Gp" monogram with the robin (logo-gp / logo-gp-light, from lib/content/imagery.ts) and the tracked wordmark.
 * Until that file exists the monogram is drawn in type. Nothing else in the app references the logo.
 *
 * `priority` defaults false and should only ever be passed by the ONE instance that's genuinely above the
 * fold on first paint (Navbar's header logo). The Footer and MobileMenu also render this component on
 * every page — marking every instance priority (as this once did) tells the browser to preload a
 * below-the-fold/hidden logo at high fetch priority on every single page load, competing with the page's
 * real LCP image (the hero) for the one priority preload slot that actually matters.
 */
export function Logo({ className, tone = "dark", priority = false }: { className?: string; tone?: "dark" | "light"; priority?: boolean }) {
  const ink = tone === "light" ? "text-brand-on-primary" : "text-brand-dark";
  const mark = siteImage(tone === "light" ? "logo-gp-light" : "logo-gp");
  return (
    <Link href="/" aria-label="GiftPing — home" className={cn("group flex items-center gap-3", className)}>
      {mark ? (
        <Image src={mark.src} alt="" width={mark.width} height={mark.height} priority={priority} sizes="56px" className="h-14 w-14 shrink-0 object-contain transition-transform duration-500 group-hover:-rotate-3 group-hover:scale-105" />
      ) : (
        <span className="relative inline-flex h-11 w-12 items-center justify-center">
          <Bird className="absolute -top-0.5 left-1.5 h-3.5 w-3.5 text-brand-secondary transition-transform duration-500 group-hover:-rotate-12" aria-hidden="true" />
          <span className={cn("font-heading text-[2.15rem] italic leading-none", tone === "light" ? "text-brand-on-primary" : "text-brand-primary")}>
            G<span className="-ml-1 text-brand-secondary">p</span>
          </span>
        </span>
      )}
      <span className="hidden flex-col whitespace-nowrap leading-none sm:flex">
        <span className={cn("font-heading text-[1.2rem] uppercase tracking-[0.42em]", ink)}>Giftping</span>
        <span className={cn("mt-1.5 hidden text-[8.5px] 2xl:block font-medium uppercase tracking-[0.26em]", tone === "light" ? "text-brand-on-primary/60" : "text-brand-dark/55")}>Your companion for every occasion</span>
      </span>
    </Link>
  );
}

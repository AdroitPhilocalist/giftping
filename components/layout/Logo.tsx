import Link from "next/link";
import { Bird } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * The GiftPing mark: a "GP" monogram with the robin, and the tracked wordmark. This is drawn in type until the client's final logo file exists —
 * when it does, put it in lib/content/imagery.ts and render it here; nothing else in the app references the logo.
 */
export function Logo({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const ink = tone === "light" ? "text-brand-on-primary" : "text-brand-dark";
  return (
    <Link href="/" aria-label="GiftPing — home" className={cn("group flex items-center gap-3", className)}>
      <span className="relative inline-flex h-11 w-12 items-center justify-center">
        <Bird className="absolute -top-0.5 left-1.5 h-3.5 w-3.5 text-brand-secondary transition-transform duration-500 group-hover:-rotate-12" aria-hidden="true" />
        <span className={cn("font-heading text-[2.15rem] italic leading-none", tone === "light" ? "text-brand-on-primary" : "text-brand-primary")}>
          G<span className="-ml-1 text-brand-secondary">p</span>
        </span>
      </span>
      <span className="hidden flex-col whitespace-nowrap leading-none sm:flex">
        <span className={cn("font-heading text-[1.2rem] uppercase tracking-[0.42em]", ink)}>Giftping</span>
        <span className={cn("mt-1.5 hidden text-[8.5px] 2xl:block font-medium uppercase tracking-[0.26em]", tone === "light" ? "text-brand-on-primary/60" : "text-brand-dark/55")}>Your companion for every occasion</span>
      </span>
    </Link>
  );
}

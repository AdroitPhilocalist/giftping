import Link from "next/link";
import { signInHref } from "@/lib/auth/paths";
import { cn } from "@/lib/utils/cn";

/**
 * The one thing the sample diary must say out loud: this is a sample, and saving needs an account.
 * It sits above the desk rather than inside the book, so it never eats into the page area.
 */
export function PreviewBanner({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[78rem] px-4 pt-3 sm:px-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-2xl border border-brand-secondary/25 bg-brand-surface/95 px-4 py-2.5 shadow-card">
        <p className="min-w-0 text-sm leading-snug text-brand-dark/75">
          <span className="mr-2 inline-flex items-center rounded-full bg-brand-secondary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-secondary-dark">Sample diary</span>
          A little look around — every person and date here is made up.{" "}
          <span className="font-medium text-brand-dark">Sign in to save your own.</span>
        </p>
        <Link href={signInHref()} className="shrink-0 rounded-full bg-brand-primary px-4 py-2 text-sm font-medium text-brand-on-primary transition-colors hover:bg-brand-primary-dark">
          Start my diary <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

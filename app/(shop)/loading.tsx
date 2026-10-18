import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Shop route skeleton — the shape most pages in this group share: a heading, a line of subtext, then a grid of
 * cards. It is the direct answer to "I clicked and nothing happened": this paints the instant a navigation starts,
 * while the real page streams in over it. The header and footer are the root layout's, so they stay put.
 *
 * (`/diary` has its own, more fitting skeleton in `app/(shop)/diary/loading.tsx`.)
 */
export default function ShopLoading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <span role="status" className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-card border border-brand-dark/[0.06] bg-brand-surface p-3 shadow-card">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="mt-3 h-3.5 w-4/5" />
            <Skeleton className="mt-2 h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

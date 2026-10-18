import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Generic route skeleton for pages outside the shop group (about, contact, legal, the vendor portal…). Content
 * only — the header and footer come from the root layout and stay in place while the page paints.
 */
export default function Loading() {
  return (
    <div aria-busy="true" className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <span role="status" className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-52" />
      <Skeleton className="mt-4 h-4 w-full max-w-xl" />
      <Skeleton className="mt-2 h-4 w-3/4 max-w-md" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-card" />
        <Skeleton className="h-40 rounded-card" />
      </div>
    </div>
  );
}

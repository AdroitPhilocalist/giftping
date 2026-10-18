import { Skeleton } from "@/components/ui/Skeleton";

/** Admin panel skeleton — the sidebar belongs to `app/admin/layout.tsx`; this is the content column: a heading and a
 *  table, the shape nearly every admin screen shares. */
export default function AdminLoading() {
  return (
    <div aria-busy="true" className="min-w-0">
      <span role="status" className="sr-only">Loading…</span>
      <Skeleton className="h-7 w-40" />
      <div className="mt-6 overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-surface shadow-card">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-brand-dark/[0.05] px-4 py-3.5 last:border-0">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="hidden h-4 w-1/6 sm:block" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

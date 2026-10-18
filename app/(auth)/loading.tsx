import { Skeleton } from "@/components/ui/Skeleton";

/** Auth form skeleton — the frame (picture panel, waving robin) belongs to `app/(auth)/layout.tsx`, so this is only
 *  the form column that swaps out during a navigation between sign-in / sign-up / reset. */
export default function AuthLoading() {
  return (
    <div aria-busy="true">
      <span role="status" className="sr-only">Loading…</span>
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      <div className="mt-6 space-y-4">
        <Skeleton className="h-11 w-full rounded-button" />
        <Skeleton className="h-11 w-full rounded-button" />
        <Skeleton className="h-11 w-full rounded-button" />
      </div>
    </div>
  );
}

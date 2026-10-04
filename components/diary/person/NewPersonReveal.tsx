"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Wraps the polaroid at the top of a person's page so that right after ADDING them it visibly lands and its tape peels down into place, instead of just being
 * there on arrival — a small "they're really in your diary now" moment. `justAdded` comes from a one-shot `?welcome=1` the redirect in
 * components/diary/forms/DiaryDialogs.tsx adds after creating someone; this strips that param from the URL on mount (via `router.replace`, no scroll) so a
 * later refresh or the back button never replays it. The reveal class itself is captured into state once at mount, not read from the prop again, so the
 * animation can't be interrupted by that URL cleanup re-render.
 */
export function NewPersonReveal({ justAdded, children }: { justAdded: boolean; children: ReactNode }) {
  const [reveal] = useState(justAdded);
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (justAdded) router.replace(pathname, { scroll: false });
    // Deliberately once, on mount only — `justAdded` is only ever true on first render; re-running this on a route change would strip a param that was
    // never ours to strip.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div className={reveal ? "dy-person-reveal" : undefined}>{children}</div>;
}

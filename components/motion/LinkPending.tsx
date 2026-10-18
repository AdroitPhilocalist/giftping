"use client";

import { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils/cn";

/**
 * A tiny gold dot that fades in on the top-right corner of the `<Link>` it is rendered INSIDE, while that link is
 * navigating (Next 15.3+'s `useLinkStatus`). It is the inline half of the navigation-feedback layer — the nav can
 * claim "I heard you" the moment you click, even before the destination starts streaming.
 *
 * Absolutely positioned on purpose: the header pill is width-guarded (see the header-fit work), so a reserved
 * inline space is not an option — this costs no layout at all. It waits ~120ms before showing, so a fast hop never
 * flashes it. Under reduced motion the fade/pulse are dropped but the dot still appears statically.
 */
export function LinkPending({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  return <span aria-hidden="true" className={cn("gp-link-pending", pending && "is-pending", className)} />;
}

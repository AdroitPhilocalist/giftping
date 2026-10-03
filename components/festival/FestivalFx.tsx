"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Floating decoration is for browsing, not for paying or managing: it stays off the money pages and both portals.
const QUIET_PREFIXES = ["/checkout", "/cart", "/orders", "/admin", "/vendor/", "/sign-in", "/sign-up", "/reset-password", "/update-password"];

/** The site-wide festival ambience, drawn above the page but below the header, never catching a click. `children` is the (server-rendered) Ambience. */
export function FestivalFx({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/vendor" || QUIET_PREFIXES.some((p) => pathname.startsWith(p))) return null;
  return <div className="gp-festival-fx" aria-hidden="true">{children}</div>;
}

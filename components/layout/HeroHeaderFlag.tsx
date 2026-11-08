"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Marks the current page as having a photo bled up behind the fixed header (the -mt-[5.5rem] lg:-mt-[6.5rem]
 * trick — see HomeHero.tsx/VendorHero.tsx), so app/globals.css can give the header its low-alpha glass tint
 * there instead of the opaque default every other page gets.
 *
 * useLayoutEffect (not useEffect) so the attribute lands before the first paint — on the production build
 * hydration is slower and a plain useEffect would leave a visible flash of the opaque green header.
 * Falls back to usePathname so it works even when mounted outside a hero section.
 */
export function HeroHeaderFlag() {
  const pathname = usePathname();
  const isHero = pathname === "/" || pathname.startsWith("/vendors/");
  useLayoutEffect(() => {
    if (!isHero) return;
    document.documentElement.dataset.heroHeader = "true";
    return () => {
      delete document.documentElement.dataset.heroHeader;
    };
  }, [isHero]);
  return null;
}

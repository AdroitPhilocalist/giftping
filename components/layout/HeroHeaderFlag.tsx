"use client";

import { useEffect } from "react";

/**
 * Marks the current page as having a photo bled up behind the fixed header (the -mt-[5.5rem] lg:-mt-[6.5rem]
 * trick — see HomeHero.tsx/VendorHero.tsx), so app/globals.css can give the header its low-alpha glass tint
 * there instead of the opaque default every other page gets. Mount once inside any section using that trick.
 */
export function HeroHeaderFlag() {
  useEffect(() => {
    document.documentElement.dataset.heroHeader = "true";
    return () => {
      delete document.documentElement.dataset.heroHeader;
    };
  }, []);
  return null;
}

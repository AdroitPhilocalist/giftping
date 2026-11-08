"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ReactNode } from "react";

/** The About / Specifications / Delivery & Returns / Reviews tabs. Panels are rendered on the server and passed in, so the content stays server-rendered. */
export function ProductTabs({
  about,
  specifications,
  delivery,
  reviews,
  reviewCount,
}: {
  about: ReactNode;
  /** Omit this when the product has no type-specific values, and the tab (and panel) simply won't render. */
  specifications?: ReactNode;
  delivery: ReactNode;
  reviews: ReactNode;
  reviewCount: number;
}) {
  const trigger =
    "relative px-1 pb-3 text-sm font-medium text-brand-dark/55 transition-colors hover:text-brand-dark data-[state=active]:text-brand-dark after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:origin-left after:scale-x-0 after:bg-brand-secondary after:transition-transform after:duration-300 data-[state=active]:after:scale-x-100 sm:text-base";
  return (
    <TabsPrimitive.Root defaultValue="about">
      <TabsPrimitive.List className="flex gap-7 overflow-x-auto border-b border-brand-dark/10" aria-label="Product details">
        <TabsPrimitive.Trigger value="about" className={trigger}>About this gift</TabsPrimitive.Trigger>
        {specifications ? <TabsPrimitive.Trigger value="specifications" className={trigger}>Specifications</TabsPrimitive.Trigger> : null}
        <TabsPrimitive.Trigger value="delivery" className={`${trigger} whitespace-nowrap`}>Delivery &amp; returns</TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger value="reviews" className={trigger}>Reviews{reviewCount > 0 ? ` (${reviewCount})` : ""}</TabsPrimitive.Trigger>
      </TabsPrimitive.List>
      <TabsPrimitive.Content value="about" className="pt-7 outline-none">{about}</TabsPrimitive.Content>
      {specifications ? <TabsPrimitive.Content value="specifications" className="pt-7 outline-none">{specifications}</TabsPrimitive.Content> : null}
      <TabsPrimitive.Content value="delivery" className="pt-7 outline-none">{delivery}</TabsPrimitive.Content>
      <TabsPrimitive.Content value="reviews" className="pt-7 outline-none">{reviews}</TabsPrimitive.Content>
    </TabsPrimitive.Root>
  );
}

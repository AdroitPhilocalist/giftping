"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * A filter/sort action rendered as a button, not an <a href>. That keeps the combinatorial
 * query-string URLs out of the crawlable link graph while still letting a shopper change one
 * filter from an empty result page. Prefetch happens only when the shopper shows intent
 * (hover, keyboard focus or touch), so a page with dozens of filters does not silently request
 * dozens of prefetches.
 */
export function FilterAction({
  href,
  children,
  className,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: {
  href: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick">) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);

  return (
    <button
      type="button"
      className={cn("cursor-pointer", className)}
      {...props}
      onClick={() => router.push(href)}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
    >
      {children}
    </button>
  );
}

/**
 * A real link for bounded navigation (pagination, product/category pages), but with the same
 * intent-only prefetch. The link stays shareable/openable in a new tab; only the automatic
 * background prefetch is disabled.
 */
export function IntentLink({
  href,
  children,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: {
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href);

  return (
    <Link
      href={href}
      prefetch={false}
      {...props}
      onMouseEnter={(event) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        prefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        prefetch();
        onTouchStart?.(event);
      }}
    >
      {children}
    </Link>
  );
}

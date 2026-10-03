"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DiaryBookIcon } from "@/components/art/DiaryBookIcon";

/**
 * The header's door to the Personal Gifting Diary — the product's signature feature, so it is NOT a text link like the rest of the nav: a copper, gold-edged
 * button with the drawn diary standing out of it, a slow shimmer, and a caption. It never disappears: the full label shows on a wide bar, and when the header
 * condenses on scroll or the screen narrows it shrinks to the book alone (styling and that shrinking: `.gp-diary-btn` in globals.css).
 */
export function DiaryButton() {
  const current = usePathname().startsWith("/diary");
  return (
    <Link href="/diary" aria-label="My Diary — your personal gifting diary" aria-current={current ? "page" : undefined} title="My Diary" className="gp-diary-btn">
      <span className="gp-diary-book"><DiaryBookIcon className="h-full w-full" /></span>
      <span className="gp-diary-text">
        <span className="gp-diary-kicker">Never forget a date</span>
        <span className="gp-diary-name">My Diary</span>
      </span>
    </Link>
  );
}

"use client";

import type { ReactNode } from "react";
import { useDiaryBook } from "./DiaryBook";

/** A handwritten link inside a page that turns the book to another part of it ("See everyone →"). It draws nothing outside the book. */
export function TurnLink({ to, className = "dy-link", children }: { to: string; className?: string; children: ReactNode }) {
  const book = useDiaryBook();
  if (!book) return null;
  return <button type="button" className={className} onClick={() => book.goTo(to)}>{children}</button>;
}

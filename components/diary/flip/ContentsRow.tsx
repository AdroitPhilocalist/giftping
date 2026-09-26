"use client";

import type { ReactNode } from "react";
import { useDiaryBook } from "./DiaryBook";

/** One line of the diary's contents page: the name, a dotted leader and the page number — press it and the book turns there. */
export function ContentsRow({ to, page, icon, children }: { to: string; page: number; icon?: ReactNode; children: ReactNode }) {
  const book = useDiaryBook();
  return (
    <li>
      <button type="button" className="dy-contents-row" onClick={() => book?.goTo(to)}>
        {icon ? <span className="self-center" aria-hidden="true">{icon}</span> : null}
        <span>{children}</span>
        <span className="dy-contents-dots" aria-hidden="true" />
        <span className="dy-contents-no">{page}</span>
      </button>
    </li>
  );
}

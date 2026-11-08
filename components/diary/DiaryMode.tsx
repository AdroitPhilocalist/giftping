"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { signInHref } from "@/lib/auth/paths";

interface DiaryModeValue {
  /** true only inside the public sample at /diary/preview — every write action becomes a sign-in link. */
  preview: boolean;
  signInHref: string;
}

const DiaryModeContext = createContext<DiaryModeValue>({ preview: false, signInHref: signInHref() });

/**
 * The real diary and the guest preview render the same book. This is the one switch between them:
 * in preview mode, components that would call a server action (add, edit, remove, plan, wishlist)
 * render a sign-in link instead. It is deliberately a client context — only the interactive leaves
 * need it; the page structure is built on the server from sample rows.
 */
export function DiaryModeProvider({ preview = false, children }: { preview?: boolean; children: ReactNode }) {
  const value = useMemo(() => ({ preview, signInHref: signInHref() }), [preview]);
  return <DiaryModeContext.Provider value={value}>{children}</DiaryModeContext.Provider>;
}

export function useDiaryMode() {
  return useContext(DiaryModeContext);
}

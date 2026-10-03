"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

interface Preview {
  /** what the shopper has typed for the engraving */
  text: string;
  setText: (text: string) => void;
  /** bumps whenever the shopper starts typing — the gallery uses it to jump to the photo the text appears on */
  focusTick: number;
  requestPhoto: () => void;
}

const PreviewContext = createContext<Preview | null>(null);

/**
 * Shared between the product gallery (which draws the text) and the buy box (where it's typed) — they sit in different columns of the product page, so a
 * tiny context rather than threading props through unrelated markup. Everything outside a provider simply gets `null` and does nothing.
 */
export function PersonalizationPreviewProvider({ children }: { children: React.ReactNode }) {
  const [text, setText] = useState("");
  const [focusTick, setTick] = useState(0);
  const requestPhoto = useCallback(() => setTick((t) => t + 1), []);
  const value = useMemo(() => ({ text, setText, focusTick, requestPhoto }), [text, focusTick, requestPhoto]);
  return <PreviewContext.Provider value={value}>{children}</PreviewContext.Provider>;
}

export const usePersonalizationPreview = () => useContext(PreviewContext);

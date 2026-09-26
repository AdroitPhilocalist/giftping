"use client";

import { useSyncExternalStore } from "react";
import { ROBIN_CURSOR_EVENT, ROBIN_CURSOR_KEY, robinCursorWanted } from "@/components/motion/RobinCursor";

const subscribeSetting = (cb: () => void) => {
  window.addEventListener(ROBIN_CURSOR_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(ROBIN_CURSOR_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};
const subscribeFine = (cb: () => void) => {
  const mq = window.matchMedia("(pointer: fine)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** A footer switch for the robin cursor. Hidden on touch screens (where the cursor never appears anyway). */
export function RobinCursorToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSetting, robinCursorWanted, () => true);
  const fine = useSyncExternalStore(subscribeFine, () => window.matchMedia("(pointer: fine)").matches, () => false);
  if (!fine) return null;
  return (
    <button
      type="button"
      className={className}
      aria-pressed={on}
      onClick={() => {
        try {
          window.localStorage.setItem(ROBIN_CURSOR_KEY, on ? "off" : "on");
        } catch {
          /* private mode: the choice just lasts until the page is reloaded */
        }
        window.dispatchEvent(new Event(ROBIN_CURSOR_EVENT));
      }}
    >
      Robin cursor: {on ? "on" : "off"}
    </button>
  );
}

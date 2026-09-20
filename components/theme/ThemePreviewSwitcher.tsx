"use client";

import { useState } from "react";
import { THEMES } from "@/lib/theme/themes";
import { cn } from "@/lib/utils/cn";

/**
 * A preview-only switcher for the style sheet: it sets data-theme on <html> in THIS browser tab (nothing is saved, nobody else sees it), so the whole
 * page — real header, footer, everything — restyles instantly. It exists to show that a makeover is only variables.
 */
export function ThemePreviewSwitcher() {
  const [current, setCurrent] = useState("native");
  function choose(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    setCurrent(id);
  }
  return (
    <div role="radiogroup" aria-label="Preview a theme" className="flex flex-wrap gap-2">
      {Object.values(THEMES).map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={current === t.id}
          onClick={() => choose(t.id)}
          className={cn("rounded-full border px-4 py-1.5 text-sm transition-colors", current === t.id ? "border-brand-primary bg-brand-primary text-brand-on-primary" : "border-brand-dark/20 text-brand-dark hover:bg-brand-accent")}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

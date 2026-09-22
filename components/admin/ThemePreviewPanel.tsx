"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { setThemePreviewAction } from "@/lib/admin/theme-actions";
import type { ThemeDef } from "@/lib/theme/themes";
import { cn } from "@/lib/utils/cn";

/** Preview any registered theme (including the demo ones) in THIS admin's own browser, without scheduling anything or affecting other visitors. */
export function ThemePreviewPanel({ themes, previewing }: { themes: ThemeDef[]; previewing: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function preview(id: string | null) {
    startTransition(async () => {
      await setThemePreviewAction(id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card">
      <h2 className="font-heading text-lg text-brand-dark">Preview a theme</h2>
      <p className="mt-1 text-sm text-brand-dark/60">See any theme exactly as a visitor would, on every page — visible only in your own browser, nothing goes live.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {themes.map((t) => {
          const on = previewing === t.id;
          return (
            <button
              key={t.id}
              type="button"
              disabled={pending}
              onClick={() => preview(on ? null : t.id)}
              aria-pressed={on}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-all duration-300 disabled:opacity-50",
                on ? "border-brand-secondary bg-brand-secondary text-brand-on-secondary shadow-card" : "border-brand-dark/15 text-brand-dark hover:border-brand-secondary/50",
              )}
            >
              {on ? <Eye className="h-3.5 w-3.5" /> : null}
              {t.label}
            </button>
          );
        })}
      </div>
      {previewing ? (
        <button type="button" disabled={pending} onClick={() => preview(null)} className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-dark/60 hover:text-brand-dark">
          <EyeOff className="h-3.5 w-3.5" /> Stop previewing
        </button>
      ) : null}
    </div>
  );
}

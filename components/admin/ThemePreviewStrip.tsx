"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { setThemePreviewAction } from "@/lib/admin/theme-actions";

/** A quiet floating reminder, visible only to the previewing admin, on every page — so it's obvious this look isn't live for anyone else. */
export function ThemePreviewStrip({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:justify-end sm:pr-6">
      <div className="flex items-center gap-3 rounded-full bg-brand-primary-dark px-4 py-2 text-xs text-brand-on-primary shadow-lift">
        <span>Previewing <span className="font-medium">{label}</span> — visible to you only</span>
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(async () => { await setThemePreviewAction(null); router.refresh(); })}
          className="flex items-center gap-1 rounded-full bg-brand-on-primary/15 px-2.5 py-1 font-medium transition-colors hover:bg-brand-on-primary/25"
        >
          <X className="h-3 w-3" aria-hidden="true" /> Stop
        </button>
      </div>
    </div>
  );
}

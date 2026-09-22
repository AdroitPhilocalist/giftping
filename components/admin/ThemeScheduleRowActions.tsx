"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { deleteThemeScheduleAction, setThemeScheduleActiveAction } from "@/lib/admin/theme-actions";

export function ThemeScheduleRowActions({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok?: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        if (ok) toast.success(ok);
        router.refresh();
      }
    });
  return (
    <span className="flex items-center gap-3 text-xs">
      <button type="button" disabled={pending} onClick={() => run(() => setThemeScheduleActiveAction(id, !active), active ? "Paused." : "Activated.")} className="text-brand-dark/60 hover:text-brand-primary">
        {active ? "Pause" : "Activate"}
      </button>
      <button type="button" disabled={pending} onClick={() => confirm("Delete this schedule entry? This can't be undone.") && run(() => deleteThemeScheduleAction(id), "Deleted.")} className="text-brand-dark/50 hover:text-red-700">
        Delete
      </button>
    </span>
  );
}

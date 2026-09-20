"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { deleteBannerAction, moveBannerAction, setBannerActiveAction } from "@/lib/admin/banner-actions";

export function BannerRowActions({ id, active, first, last }: { id: string; active: boolean; first: boolean; last: boolean }) {
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
      <button type="button" disabled={pending || first} onClick={() => run(() => moveBannerAction(id, "up"))} aria-label="Move earlier" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↑</button>
      <button type="button" disabled={pending || last} onClick={() => run(() => moveBannerAction(id, "down"))} aria-label="Move later" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↓</button>
      <button type="button" disabled={pending} onClick={() => run(() => setBannerActiveAction(id, !active), active ? "Banner paused." : "Banner activated.")} className="text-brand-dark/60 hover:text-brand-primary">
        {active ? "Pause" : "Activate"}
      </button>
      <button type="button" disabled={pending} onClick={() => confirm("Delete this banner and its image? This can't be undone.") && run(() => deleteBannerAction(id), "Banner deleted.")} className="text-brand-dark/50 hover:text-red-700">
        Delete
      </button>
    </span>
  );
}

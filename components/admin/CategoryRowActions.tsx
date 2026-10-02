"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { moveCategoryAction, setCategoryActiveAction } from "@/lib/admin/category-actions";

export function CategoryRowActions({ id, active, first, last }: { id: string; active: boolean; first: boolean; last: boolean }) {
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
      <button type="button" disabled={pending || first} onClick={() => run(() => moveCategoryAction(id, "up"))} aria-label="Move earlier" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↑</button>
      <button type="button" disabled={pending || last} onClick={() => run(() => moveCategoryAction(id, "down"))} aria-label="Move later" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↓</button>
      <button type="button" disabled={pending} onClick={() => run(() => setCategoryActiveAction(id, !active), active ? "Category hidden." : "Category shown on the storefront.")} className="text-brand-dark/60 hover:text-brand-primary">
        {active ? "Hide" : "Show"}
      </button>
    </span>
  );
}

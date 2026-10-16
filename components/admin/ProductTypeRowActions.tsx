"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { deleteProductTypeAction, moveProductTypeAction, setProductTypeActiveAction } from "@/lib/admin/product-type-actions";

export function ProductTypeRowActions({ id, name, active, first, last }: { id: string; name: string; active: boolean; first: boolean; last: boolean }) {
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
      <button type="button" disabled={pending || first} onClick={() => run(() => moveProductTypeAction(id, "up"))} aria-label="Move earlier" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↑</button>
      <button type="button" disabled={pending || last} onClick={() => run(() => moveProductTypeAction(id, "down"))} aria-label="Move later" className="text-brand-dark/60 hover:text-brand-primary disabled:opacity-30">↓</button>
      <button type="button" disabled={pending} onClick={() => run(() => setProductTypeActiveAction(id, !active), active ? "Hidden from the storefront." : "Shown on the storefront.")} className="text-brand-dark/60 hover:text-brand-primary">
        {active ? "Hide" : "Show"}
      </button>
      <button type="button" disabled={pending} onClick={() => confirm(`Delete "${name}"? This can't be undone.`) && run(() => deleteProductTypeAction(id), "Product type deleted.")} className="text-brand-dark/50 hover:text-red-700">
        Delete
      </button>
    </span>
  );
}

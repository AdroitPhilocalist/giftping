"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/Toast";
import { deleteCouponAction, setCouponActiveAction } from "@/lib/admin/coupon-actions";

export function CouponRowActions({ id, active, used }: { id: string; active: boolean; used: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (fn: () => Promise<{ error?: string }>, ok: string) =>
    startTransition(async () => {
      const r = await fn();
      if (r.error) toast.error(r.error);
      else {
        toast.success(ok);
        router.refresh();
      }
    });
  return (
    <span className="flex items-center gap-3 text-xs">
      <button type="button" disabled={pending} onClick={() => run(() => setCouponActiveAction(id, !active), active ? "Coupon paused." : "Coupon activated.")} className="text-brand-dark/60 hover:text-brand-primary">
        {active ? "Pause" : "Activate"}
      </button>
      {used ? null : (
        <button type="button" disabled={pending} onClick={() => confirm("Delete this coupon? This can't be undone.") && run(() => deleteCouponAction(id), "Coupon deleted.")} className="text-brand-dark/50 hover:text-red-700">
          Delete
        </button>
      )}
    </span>
  );
}

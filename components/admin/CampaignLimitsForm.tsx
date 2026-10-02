"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { saveLimitsAction } from "@/lib/admin/campaign-actions";

export function CampaignLimitsForm({ dailyCap, monthlyCap }: { dailyCap: number; monthlyCap: number }) {
  const router = useRouter();
  const [daily, setDaily] = useState(String(dailyCap));
  const [monthly, setMonthly] = useState(String(monthlyCap));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveLimitsAction({ dailyCap: Number(daily), monthlyCap: Number(monthly) });
      if (result.error) return setError(result.error);
      toast.success("Limits saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-3">
      <div><Label htmlFor="cap-daily">Per day</Label><Input id="cap-daily" type="number" min={0} inputMode="numeric" value={daily} onChange={(e) => setDaily(e.target.value)} className="w-28" /></div>
      <div><Label htmlFor="cap-monthly">Per month</Label><Input id="cap-monthly" type="number" min={0} inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} className="w-32" /></div>
      <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save limits"}</Button>
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </form>
  );
}

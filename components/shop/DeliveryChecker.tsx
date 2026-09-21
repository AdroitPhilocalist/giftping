"use client";

import { useEffect, useState, useTransition } from "react";
import { MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { checkProductDeliveryAction } from "@/lib/shop/delivery-actions";
import { describeDelivery } from "@/lib/shop/delivery-estimate";
import { cn } from "@/lib/utils/cn";

const STORE_KEY = "gp_pincode";

/** "Check delivery to your pincode" — answers with a real serviceability check and day estimate. Remembers the last pincode in this browser only. */
export function DeliveryChecker({ productId }: { productId: string }) {
  const [pincode, setPincode] = useState("");
  const [answer, setAnswer] = useState<{ tone: "good" | "bad" | "neutral"; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved && /^[1-9]\d{5}$/.test(saved)) setPincode(saved); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a per-browser preference after mount
    } catch {
      /* storage can be blocked; the field simply starts empty */
    }
  }, []);

  function check(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setAnswer(null);
    startTransition(async () => {
      const result = await checkProductDeliveryAction({ productId, pincode });
      if (!result.ok) return setError(result.error);
      try { localStorage.setItem(STORE_KEY, pincode); } catch { /* ignore */ }
      setAnswer(describeDelivery({ status: result.status, etdDays: result.etdDays, pincode }));
    });
  }

  return (
    <div className="rounded-card border border-brand-dark/[0.07] bg-brand-surface p-4">
      <form onSubmit={check} className="flex items-center gap-2" noValidate>
        <label htmlFor={`pin-${productId}`} className="sr-only">Delivery pincode</label>
        <MapPin className="h-5 w-5 shrink-0 text-brand-secondary" strokeWidth={1.5} aria-hidden="true" />
        <input
          id={`pin-${productId}`}
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter delivery pincode"
          className="min-w-0 flex-1 rounded-button border border-brand-dark/15 bg-brand-light/60 px-3 py-2 text-sm text-brand-dark placeholder:text-brand-dark/45 focus:border-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-secondary/30"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={pending || pincode.length !== 6}>{pending ? "Checking…" : "Check"}</Button>
      </form>
      <div aria-live="polite" className="min-h-0">
        {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
        {answer ? (
          <p className={cn("mt-2 flex items-start gap-2 text-sm", answer.tone === "bad" ? "text-red-700" : answer.tone === "good" ? "text-brand-primary" : "text-brand-dark/70")}>
            <Truck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {answer.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}

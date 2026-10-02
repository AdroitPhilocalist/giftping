"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { setMarketingConsentAction } from "@/lib/marketing/consent-actions";
import { MARKETING_CONSENT_DETAIL, MARKETING_CONSENT_LABEL } from "@/lib/marketing/consent";

/**
 * The marketing-email consent switch. OFF unless the person has actively turned it on; one click either way. Deliberately separate
 * from the notification rows below it: those are about things you asked for (orders, reminders), this is optional promotional mail.
 */
export function MarketingConsentCard({ initialOn, changedLabel }: { initialOn: boolean; changedLabel: string | null }) {
  const [on, setOn] = useState(initialOn);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      const result = await setMarketingConsentAction(next);
      if (result.error) {
        setOn(!next);
        toast.error(result.error);
      } else {
        toast.success(next ? "You'll get offers and new arrivals by email." : "You're unsubscribed from marketing emails.");
      }
    });
  }

  return (
    <section aria-labelledby="marketing-heading" className="mt-6 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
      <div className="min-w-0 flex-1">
        <h2 id="marketing-heading" className="font-medium text-brand-dark">Offers &amp; new arrivals by email</h2>
        <p className="mt-0.5 text-sm text-brand-dark/80">{MARKETING_CONSENT_LABEL}</p>
        <p className="mt-1 text-xs text-brand-dark/55">{MARKETING_CONSENT_DETAIL}</p>
        {changedLabel ? <p className="mt-1 text-xs text-brand-dark/45">{changedLabel}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-labelledby="marketing-heading"
        disabled={pending}
        onClick={toggle}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand-primary" : "bg-brand-dark/20"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-brand-surface shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { setEmailPreferenceAction } from "@/lib/account/notification-actions";

export function NotificationToggle({ category, label, hint, initial }: { category: "diary_reminders" | "order_updates" | "promotions"; label: string; hint: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic
    startTransition(async () => {
      const result = await setEmailPreferenceAction({ category, emailEnabled: next });
      if (result.error) {
        setOn(!next);
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="flex items-start justify-between gap-4 p-4">
      <div>
        <p className="font-medium text-brand-dark">{label}</p>
        <p className="text-sm text-brand-dark/60">{hint}</p>
      </div>
      <button
        type="button" role="switch" aria-checked={on} aria-label={`Email me: ${label}`} disabled={pending} onClick={toggle}
        className={`relative mt-1 h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand-primary" : "bg-brand-dark/20"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
      </button>
    </li>
  );
}

"use client";

import { useState, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { setChannelPreferenceAction } from "@/lib/account/notification-actions";

type Category = "diary_reminders" | "order_updates" | "wishlist_alerts";

function Switch({ label, on, disabled, onToggle }: { label: string; on: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onToggle}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-brand-primary" : "bg-brand-dark/20"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-brand-surface shadow transition-all ${on ? "left-[1.375rem]" : "left-0.5"}`} />
    </button>
  );
}

export function NotificationToggle({ category, label, hint, initialEmail, initialPush }: { category: Category; label: string; hint: string; initialEmail: boolean; initialPush: boolean }) {
  const [state, setState] = useState({ email: initialEmail, push: initialPush });
  const [pending, startTransition] = useTransition();

  function toggle(channel: "email" | "push") {
    const next = !state[channel];
    setState((s) => ({ ...s, [channel]: next })); // optimistic
    startTransition(async () => {
      const result = await setChannelPreferenceAction({ category, channel, enabled: next });
      if (result.error) {
        setState((s) => ({ ...s, [channel]: !next }));
        toast.error(result.error);
      }
    });
  }

  return (
    <li className="flex flex-wrap items-start justify-between gap-4 p-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-brand-dark">{label}</p>
        <p className="text-sm text-brand-dark/60">{hint}</p>
      </div>
      <div className="flex items-center gap-5 text-xs text-brand-dark/60">
        <label className="flex flex-col items-center gap-1">Email<Switch label={`Email me: ${label}`} on={state.email} disabled={pending} onToggle={() => toggle("email")} /></label>
        <label className="flex flex-col items-center gap-1">Push<Switch label={`Push me: ${label}`} on={state.push} disabled={pending} onToggle={() => toggle("push")} /></label>
      </div>
    </li>
  );
}

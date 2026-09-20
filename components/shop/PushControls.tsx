"use client";

import { useEffect, useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { disablePush, enablePush, readPushStatus, type PushStatus } from "@/lib/push/client";

/** Turning push on is always an explicit click here — never an unprompted permission popup. */
export function PushControls() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    void readPushStatus().then((s) => !cancelled && setStatus(s));
    return () => { cancelled = true; };
  }, []);

  const copy: Record<PushStatus, string> = {
    loading: "Checking this browser…",
    unsupported: "This browser can't receive push notifications (or an ad-blocker is stopping the notification service).",
    blocked: "Notifications are blocked for this site. Allow them in your browser's site settings, then come back.",
    off: "Get order updates and diary reminders as browser notifications — even when GiftPing isn't open.",
    on: "Push notifications are on for this browser.",
  };

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-brand-dark/10 bg-white p-4">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-brand-secondary-dark" />
        <div>
          <p className="font-medium text-brand-dark">Push notifications on this device</p>
          <p className="text-sm text-brand-dark/60">{copy[status]}</p>
        </div>
      </div>
      {status === "off" ? (
        <Button size="sm" disabled={pending} onClick={() => startTransition(async () => setStatus(await enablePush()))}>Turn on</Button>
      ) : status === "on" ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => startTransition(async () => setStatus(await disablePush()))}>Turn off</Button>
      ) : null}
    </div>
  );
}

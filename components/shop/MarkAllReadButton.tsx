"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { markAllNotificationsReadAction } from "@/lib/account/inbox-actions";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button variant="ghost" size="sm" disabled={pending} onClick={() => startTransition(async () => { await markAllNotificationsReadAction(); router.refresh(); })}>
      Mark all as read
    </Button>
  );
}

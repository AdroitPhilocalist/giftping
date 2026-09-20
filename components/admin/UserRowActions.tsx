"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { eraseUserAsAdminAction, suspendUserAction } from "@/lib/admin/user-actions";

export function UserRowActions({ userId, name, suspended, erased, isAdmin, isSelf }: { userId: string; name: string; suspended: boolean; erased: boolean; isAdmin: boolean; isSelf: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erasing, setErasing] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (erased) return <span className="text-xs text-brand-dark/40">Erased</span>;
  if (isAdmin || isSelf) return <span className="text-xs text-brand-dark/40">{isSelf ? "You" : "Protected"}</span>;

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string, fail: (e: string) => void) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) return fail(r.error ?? "Something went wrong.");
      toast.success(done);
      setErasing(false);
      router.refresh();
    });

  return (
    <span className="flex items-center gap-3 text-xs">
      <button type="button" disabled={pending} onClick={() => run(() => suspendUserAction(userId, !suspended), suspended ? "Account reinstated." : "Account suspended.", (e) => toast.error(e))} className="text-brand-dark/60 hover:text-brand-primary">
        {suspended ? "Reinstate" : "Suspend"}
      </button>
      <button type="button" disabled={pending} onClick={() => { setTyped(""); setError(null); setErasing(true); }} className="text-brand-dark/50 hover:text-red-700">Erase data</button>
      <Modal open={erasing} onOpenChange={setErasing} title={`Erase ${name}?`} description="Use this for a data-erasure request. It permanently removes their diary, addresses, wishlist, reviews and notifications, scrubs their personal details, and disables their login. Order records stay (without their name or address). This cannot be undone.">
        <label htmlFor="erase-confirm" className="mb-1 block text-sm font-medium text-brand-dark">Type ERASE to confirm</label>
        <Input id="erase-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setErasing(false)} disabled={pending}>Cancel</Button>
          <Button size="sm" className="bg-red-700 hover:bg-red-800" disabled={pending || typed.trim() !== "ERASE"} onClick={() => run(() => eraseUserAsAdminAction(userId), "Account erased.", setError)}>
            {pending ? "Erasing…" : "Erase permanently"}
          </Button>
        </div>
      </Modal>
    </span>
  );
}

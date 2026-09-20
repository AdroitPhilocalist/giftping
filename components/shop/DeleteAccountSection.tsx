"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { deleteMyAccountAction } from "@/lib/account/delete-actions";

export function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <section className="mt-8 rounded-2xl border border-red-200 bg-white p-5">
      <h2 className="font-heading text-lg text-brand-dark">Delete my account</h2>
      <p className="mt-1 text-sm text-brand-dark/70">
        Permanently removes your gifting diary, saved addresses, wishlist, reviews and notifications, and erases your personal details. We keep a minimal record of past orders — without your name or address — because tax law requires it.
      </p>
      <Button size="sm" variant="secondary" className="mt-3 border-red-300 text-red-800" onClick={() => { setTyped(""); setError(null); setOpen(true); }}>Delete my account…</Button>
      <Modal open={open} onOpenChange={setOpen} title="Delete your account?" description="This cannot be undone. If you have an order that hasn't been delivered yet, wait until it arrives.">
        <label htmlFor="delete-confirm" className="mb-1 block text-sm font-medium text-brand-dark">Type DELETE to confirm</label>
        <Input id="delete-confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
        {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Keep my account</Button>
          <Button size="sm" className="bg-red-700 hover:bg-red-800" disabled={pending || typed.trim() !== "DELETE"} onClick={() => startTransition(async () => { const r = await deleteMyAccountAction(typed); if (r?.error) setError(r.error); })}>
            {pending ? "Deleting…" : "Delete permanently"}
          </Button>
        </div>
      </Modal>
    </section>
  );
}

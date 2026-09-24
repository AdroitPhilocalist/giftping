"use client";

import { Feather, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { updateContactAction } from "@/lib/diary/actions";
import { HeartDoodle } from "../art/Doodles";

/** "Private notes": free writing on ruled paper — what she said she liked, what to try next time. Only ever visible to the diary's owner. */
export function PrivateNotes({ contactId, name, notes }: { contactId: string; name: string; notes: string | null }) {
  const router = useRouter();
  const [saved, setSaved] = useState(notes ?? "");
  const [draft, setDraft] = useState(notes ?? "");
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      const result = await updateContactAction(contactId, { notes: draft });
      if (result.error) return void toast.error(result.error);
      setSaved(draft.trim());
      setEditing(false);
      toast.success("Noted.");
      router.refresh();
    });
  }

  return (
    <section aria-labelledby="notes-h">
      <div className="flex items-center gap-2.5">
        <h2 id="notes-h" className="dy-h"><Feather className="dy-h-icon" aria-hidden="true" /> Private notes <Lock className="h-4 w-4 text-[var(--gp-copper)]" aria-label="Only you can see this" /></h2>
        <span className="flex-1" />
        {!editing ? <button type="button" className="dy-link" onClick={() => setEditing(true)}>{saved ? "Edit" : "Write a note"}</button> : null}
      </div>
      <div className="dy-note dy-note--cream relative mt-3 px-5 py-4" style={{ ["--torn" as string]: "var(--dy-torn-3)", ["--tilt" as string]: "0.7deg" }}>
        <span className="dy-tape dy-tape--blush" style={{ top: "-0.6rem", right: "2rem", ["--tape-rot" as string]: "6deg" }} aria-hidden="true" />
        {editing ? (
          <div>
            <label htmlFor="notes-box" className="sr-only">Private notes about {name}</label>
            <textarea id="notes-box" autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={1000} rows={5} className="dy-hand dy-lined w-full resize-y bg-transparent text-[1.35rem] outline-none" placeholder={`What did ${name} love? What should you try next time?`} />
            <div className="mt-2 flex items-center justify-end gap-3">
              <button type="button" className="dy-link" onClick={() => { setDraft(saved); setEditing(false); }} disabled={pending}>Cancel</button>
              <button type="button" className="dy-btn dy-btn--sm dy-btn--copper" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save note"}</button>
            </div>
          </div>
        ) : saved ? (
          <p className="dy-hand dy-lined whitespace-pre-wrap break-words text-[1.35rem]">{saved} <HeartDoodle /></p>
        ) : (
          <p className="dy-hand text-[1.25rem] text-[var(--dy-ink-soft)]">Nothing written yet. A line here today becomes next year&apos;s perfect gift.</p>
        )}
      </div>
    </section>
  );
}

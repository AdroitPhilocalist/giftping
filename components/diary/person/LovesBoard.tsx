"use client";

import Link from "next/link";
import { Lightbulb, Paperclip, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "@/components/ui/Toast";
import { updateContactAction } from "@/lib/diary/actions";
import { parseInterests } from "@/lib/validation/diary.schema";
import { useDiaryMode } from "../DiaryMode";
import { HeartDoodle } from "../art/Doodles";
import { Sprig } from "../art/Sprig";
import { MAX_INTERESTS } from "../forms/parts";

/**
 * "Things Mom loves": the interests the gift ideas are matched against, on a torn note held by a paperclip. Add or remove them right here —
 * each change saves straight away (and the ideas below refresh with it).
 */
export function LovesBoard({ contactId, name, interests }: { contactId: string; name: string; interests: string[] }) {
  const router = useRouter();
  const { preview, signInHref } = useDiaryMode();
  const [items, setItems] = useState(interests);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  function save(next: string[], previous: string[]) {
    setItems(next);
    startTransition(async () => {
      const result = await updateContactAction(contactId, { interests: next });
      if (result.error) { setItems(previous); toast.error(result.error); } else router.refresh();
    });
  }
  function commit() {
    const added = parseInterests(draft);
    setDraft("");
    const next = parseInterests([...items, ...added]).slice(0, MAX_INTERESTS);
    if (next.length !== items.length) save(next, items);
  }

  return (
    <section aria-labelledby="loves-h" className="dy-note dy-note--cream relative px-5 pb-6 pt-5" style={{ ["--torn" as string]: "var(--dy-torn-1)", ["--tilt" as string]: "-0.6deg" }}>
      <Paperclip className="absolute -top-3 right-8 z-[3] h-8 w-8 rotate-[14deg] text-[var(--dy-ink-soft)]" strokeWidth={1.5} aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <h2 id="loves-h" className="dy-h"><Lightbulb className="dy-h-icon" aria-hidden="true" /> Things {name} loves <HeartDoodle className="text-[0.62em]" /></h2>
        {preview ? <Link href={signInHref} className="dy-link text-[1.05rem]">Sign in to edit</Link> : null}
      </div>
      {items.length === 0 && !adding ? (
        <p className="dy-hand mt-2 text-[1.25rem] leading-[1.15] text-[var(--dy-ink-soft)]">Add a few things {name} loves — that&apos;s what makes the gift ideas good.</p>
      ) : null}
      <ul className="mt-3 flex flex-wrap gap-2.5">
        {items.map((it) => (
          <li key={it}>
            <span className="dy-chip dy-chip--tag !py-1 !text-[1.2rem]">
              <Sprig variant="leaf" className="h-4 w-2.5" />
              {it}
              {preview ? null : <button type="button" aria-label={`Remove ${it}`} className="grid place-items-center rounded-full opacity-60 hover:opacity-100" onClick={() => save(items.filter((x) => x !== it), items)}><X className="h-3.5 w-3.5" /></button>}
            </span>
          </li>
        ))}
        <li>
          {preview ? (
            items.length < MAX_INTERESTS ? <Link href={signInHref} className="dy-chip !py-1 !text-[1.2rem]"><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add more</Link> : null
          ) : adding ? (
            <input
              ref={input}
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } else if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
              onBlur={() => { commit(); setAdding(false); }}
              maxLength={30}
              aria-label={`Something ${name} loves`}
              placeholder="jasmine, sarees…"
              className="dy-field dy-hand !min-h-0 !w-40 !py-1 !text-[1.15rem]"
            />
          ) : items.length < MAX_INTERESTS ? (
            <button type="button" className="dy-chip !py-1 !text-[1.2rem]" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add more</button>
          ) : null}
        </li>
      </ul>
    </section>
  );
}

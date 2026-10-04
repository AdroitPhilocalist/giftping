"use client";

import { Bell, Camera, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "@/components/ui/Toast";
import { prepareForUpload } from "@/lib/client/prepare-image";
import {
  deleteContactAction, deleteEventAction, deleteGiftAction, logGiftAction, saveContactAction, saveEventAction, setEventActiveAction,
} from "@/lib/diary/actions";
import { parseInterests } from "@/lib/validation/diary.schema";
import type { DiaryContactRow, DiaryEventRow } from "@/lib/diary/view";
import { EVENT_TYPES, EVENT_TYPE_LABEL, RELATIONSHIPS, contactSchema, eventSchema, giftSchema } from "@/lib/validation/diary.schema";
import { OccasionSticker } from "../art/OccasionSticker";
import { BudgetField, ChipChoice, FormButtons, InterestsInput, PhotoPicker, SwitchRow } from "./parts";
import { PaperDialog, PaperError, PaperField } from "./PaperDialog";
import { cn } from "@/lib/utils/cn";

type EventType = (typeof EVENT_TYPES)[number];
const REMINDER_PRESETS = [1, 3, 7, 14, 30];

async function sendPhoto(contactId: string, file: File): Promise<string | null> {
  try {
    const body = new FormData();
    body.set("contactId", contactId);
    body.set("file", await prepareForUpload(file), "photo.jpg");
    const res = await fetch("/api/diary/photo", { method: "POST", body });
    if (res.ok) return null;
    return ((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? "The photo couldn't be uploaded.";
  } catch {
    return "The photo couldn't be uploaded.";
  }
}
async function dropPhoto(contactId: string) {
  await fetch("/api/diary/photo", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ contactId }) }).catch(() => null);
}

// ---------------------------------------------------------------------------
// A person
// ---------------------------------------------------------------------------
export function PersonDialog({ contact, photoUrl, trigger }: { contact?: DiaryContactRow; photoUrl?: string | null; trigger: (open: () => void) => ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const initial = () => ({
    name: contact?.name ?? "",
    relationship: (contact?.relationship ?? "") as string,
    interests: contact?.interests ?? ([] as string[]),
    budgetMax: contact?.budget_max ? String(Math.round(Number(contact.budget_max))) : "",
    tagline: contact?.tagline ?? "",
    giftPreferences: contact?.gift_preferences ?? "",
    notes: contact?.notes ?? "",
    isFavorite: contact?.is_favorite ?? false,
  });
  const [form, setForm] = useState(initial);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  // the page behind may have changed since this dialog was last open (a save refreshes it), so every opening starts from what is saved now
  const openDialog = () => { setForm(initial()); setFile(null); setRemovePhoto(false); setError(null); setOpen(true); };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the details.");
    startTransition(async () => {
      const result = await saveContactAction(form, contact?.id);
      if (result.error) return setError(result.error);
      const id = contact?.id ?? result.id;
      if (id && file) {
        const problem = await sendPhoto(id, file);
        if (problem) toast.error(`Saved — but ${problem.charAt(0).toLowerCase()}${problem.slice(1)}`);
      } else if (id && removePhoto) await dropPhoto(id);
      toast.success(contact ? "Saved." : `${form.name.trim()} is in your diary.`);
      setOpen(false);
      if (!contact && id) router.push(`/diary/people/${id}?welcome=1`);
      else router.refresh();
    });
  }

  return (
    <>
      {trigger(openDialog)}
      <PaperDialog
        open={open}
        onOpenChange={setOpen}
        wide
        title={contact ? `Edit ${contact.name}` : "Add someone you love"}
        subtitle={contact ? "Everything here stays private to you." : "Keep the people who make your life special."}
        aside={<PhotoPicker name={form.name} currentUrl={photoUrl} file={file} onFile={(f) => { setFile(f); if (f) setRemovePhoto(false); }} removed={removePhoto} onRemove={photoUrl ? () => setRemovePhoto(true) : undefined} />}
      >
        <form onSubmit={submit} noValidate className="space-y-5">
          <PaperField label="Name" htmlFor="p-name">
            <input id="p-name" className="dy-field" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} placeholder="e.g. Mom, Priya, Arjun…" autoFocus autoComplete="off" />
          </PaperField>
          <PaperField label="Relationship">
            <ChipChoice label="Relationship" options={RELATIONSHIPS} value={form.relationship as (typeof RELATIONSHIPS)[number] | ""} onChange={(v) => set("relationship", v)} />
          </PaperField>
          <PaperField label="Interests" htmlFor="p-int" hint="The more we know, the better the gift ideas.">
            <InterestsInput id="p-int" value={form.interests} onChange={(v) => set("interests", parseInterests(v))} />
          </PaperField>
          <PaperField label="Usual budget">
            <BudgetField id="p-bud" value={form.budgetMax} onChange={(v) => set("budgetMax", v)} />
          </PaperField>
          <PaperField label="A line about them" htmlFor="p-tag" hint="Shown under their name — “Always makes everyone feel special”.">
            <input id="p-tag" className="dy-field" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={80} placeholder="What makes them them?" />
          </PaperField>
          <SwitchRow id="p-fav" checked={form.isFavorite} onChange={(v) => set("isFavorite", v)} label="Mark as favourite" hint="Show this person first in your diary." icon={<Star className="h-6 w-6 fill-[var(--dy-gold)] text-[var(--dy-gold)]" />} />
          <details className="dy-details" open={Boolean(contact?.gift_preferences || contact?.notes)}>
            <summary className="dy-link inline-block">More about them (preferences, private notes)</summary>
            <div className="mt-3 space-y-4">
              <PaperField label="Gift preferences" htmlFor="p-pref"><textarea id="p-pref" className="dy-field" value={form.giftPreferences} maxLength={500} onChange={(e) => set("giftPreferences", e.target.value)} placeholder="Loves handmade things; allergic to nuts…" /></PaperField>
              <PaperField label="Private notes" htmlFor="p-notes"><textarea id="p-notes" className="dy-field" value={form.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} placeholder="She said she liked the jasmine candle at Nani's…" /></PaperField>
            </div>
          </details>
          <PaperError message={error} />
          <FormButtons pending={pending} submitLabel={contact ? "Save" : "Save to my diary"} onCancel={() => setOpen(false)} />
        </form>
      </PaperDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// A special date
// ---------------------------------------------------------------------------
export interface PersonOption { id: string; name: string }

export function DateDialog({ people, contactId, contactName, event, defaultType, trigger }: {
  /** who the date can be for — omit when `contactId` is fixed */
  people?: PersonOption[];
  contactId?: string;
  contactName?: string;
  event?: DiaryEventRow;
  defaultType?: EventType;
  trigger: (open: () => void) => ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const initial = () => ({
    contactId: contactId ?? event?.contact_id ?? "",
    eventType: (event?.event_type ?? defaultType ?? "birthday") as EventType,
    title: event?.title ?? "",
    eventDate: event?.event_date ?? "",
    isRecurring: event?.is_recurring ?? true,
    reminderDays: event?.reminder_days ?? [7, 3],
    notes: event?.notes ?? "",
  });
  const [form, setForm] = useState(initial);
  const openDialog = () => { setForm(initial()); setError(null); setOpen(true); };
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleDay = (d: number) => set("reminderDays", form.reminderDays.includes(d) ? form.reminderDays.filter((x) => x !== d) : [...form.reminderDays, d]);
  const needsTitle = form.eventType === "festival" || form.eventType === "other";
  const who = contactName ?? people?.find((p) => p.id === form.contactId)?.name;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = eventSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the details.");
    startTransition(async () => {
      const result = await saveEventAction(form, event?.id);
      if (result.error) return setError(result.error);
      toast.success(event ? "Saved." : "Date saved — we'll remind you in time.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {trigger(openDialog)}
      <PaperDialog open={open} onOpenChange={setOpen} wide tape="sage" title={event ? "Edit date" : "Add a special date"} subtitle={who ? `So you never miss a moment for ${who}.` : "So you never miss a moment."}>
        <form onSubmit={submit} noValidate className="space-y-5">
          {!contactId && !event ? (
            <PaperField label="Who is it for?" htmlFor="d-who">
              <select id="d-who" className="dy-field" value={form.contactId} onChange={(e) => set("contactId", e.target.value)}>
                <option value="">Choose someone…</option>
                {(people ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </PaperField>
          ) : null}
          <PaperField label="Occasion">
            <div className="mt-1 grid grid-cols-4 gap-2" role="group" aria-label="Occasion">
              {EVENT_TYPES.map((t) => (
                <button key={t} type="button" className="dy-occasion" aria-pressed={form.eventType === t} onClick={() => set("eventType", t)}>
                  <OccasionSticker type={t} className="h-9 w-9" />
                  <span>{EVENT_TYPE_LABEL[t]}</span>
                </button>
              ))}
            </div>
          </PaperField>
          {needsTitle ? (
            <PaperField label="What is it?" htmlFor="d-title"><input id="d-title" className="dy-field" value={form.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder={form.eventType === "festival" ? "Raksha Bandhan" : "Retirement party"} /></PaperField>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <PaperField label="Date" htmlFor="d-date" hint={form.isRecurring ? "For birthdays use the original date — we work out the next one." : undefined}>
              <input id="d-date" type="date" className="dy-field" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} min="1900-01-01" max="2200-12-31" />
            </PaperField>
            <div className="sm:pt-6"><SwitchRow id="d-rep" checked={form.isRecurring} onChange={(v) => set("isRecurring", v)} label="Every year" /></div>
          </div>
          <PaperField label="Remind me" hint="Up to four. Choose none to keep the date without reminders.">
            <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Reminders">
              {REMINDER_PRESETS.map((d) => (
                <button key={d} type="button" className="dy-chip" aria-pressed={form.reminderDays.includes(d)} onClick={() => toggleDay(d)}><Bell className="h-3.5 w-3.5" aria-hidden="true" />{d === 1 ? "1 day" : `${d} days`} before</button>
              ))}
            </div>
          </PaperField>
          <PaperField label="Notes" htmlFor="d-notes"><textarea id="d-notes" className="dy-field" value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} placeholder="Anything to remember?" /></PaperField>
          <PaperError message={error} />
          <FormButtons pending={pending} submitLabel="Save date" onCancel={() => setOpen(false)} tone="green" />
        </form>
      </PaperDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// A gift you gave
// ---------------------------------------------------------------------------
export function GiftDialog({ contactId, contactName, defaultEventType, trigger }: { contactId: string; contactName: string; defaultEventType?: string; trigger: (open: () => void) => ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const blank = { giftName: "", eventType: defaultEventType ?? "", amount: "", giftedOn: "", notes: "" };
  const [form, setForm] = useState(blank);
  const set = <K extends keyof typeof form>(key: K, value: string) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { contactId, ...form, eventType: (form.eventType || null) as EventType | null, giftedOn: form.giftedOn || null };
    const parsed = giftSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the details.");
    startTransition(async () => {
      const result = await logGiftAction(payload);
      if (result.error) return setError(result.error);
      toast.success("Logged — we'll remember it.");
      setOpen(false);
      setForm(blank);
      router.refresh();
    });
  }

  return (
    <>
      {trigger(() => { setForm(blank); setError(null); setOpen(true); })}
      <PaperDialog open={open} onOpenChange={setOpen} tape="mustard" title={`A gift for ${contactName}`} subtitle="Bought elsewhere? Log it so we never suggest the same thing twice.">
        <form onSubmit={submit} noValidate className="space-y-4">
          <PaperField label="What did you give?" htmlFor="g-name"><input id="g-name" className="dy-field" value={form.giftName} maxLength={120} onChange={(e) => set("giftName", e.target.value)} autoFocus placeholder="A silk scarf" /></PaperField>
          <div className="grid gap-4 sm:grid-cols-2">
            <PaperField label="Occasion" htmlFor="g-type">
              <select id="g-type" className="dy-field" value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
                <option value="">—</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}
              </select>
            </PaperField>
            <PaperField label="Date" htmlFor="g-date"><input id="g-date" type="date" className="dy-field" value={form.giftedOn} onChange={(e) => set("giftedOn", e.target.value)} /></PaperField>
          </div>
          <PaperField label="Amount spent" htmlFor="g-amt" hint="Optional."><input id="g-amt" inputMode="numeric" className="dy-field" value={form.amount} onChange={(e) => set("amount", e.target.value.replace(/[^\d.]/g, ""))} placeholder="₹" /></PaperField>
          <PaperField label="How did it go?" htmlFor="g-notes"><textarea id="g-notes" className="dy-field" value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} placeholder="She loved it — still keeps it in the puja room." /></PaperField>
          <PaperError message={error} />
          <FormButtons pending={pending} submitLabel="Log gift" onCancel={() => setOpen(false)} tone="green" />
        </form>
      </PaperDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small actions
// ---------------------------------------------------------------------------
export function RemoveButton({ kind, id, name, className, children }: { kind: "contact" | "event" | "gift"; id: string; name: string; className?: string; children?: ReactNode }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const action = kind === "contact" ? deleteContactAction : kind === "event" ? deleteEventAction : deleteGiftAction;
      const result = await action(id);
      if (result.error) return void toast.error(result.error);
      toast.success("Removed.");
      setConfirming(false);
      if (kind === "contact") router.push("/diary");
      else router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} aria-label={`Remove ${name}`} className={cn("dy-cap inline-flex items-center gap-1 hover:text-red-700", className)}>
        {children ?? <><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove</>}
      </button>
      <PaperDialog open={confirming} onOpenChange={setConfirming} perch={false} tape="blush" title={`Remove ${name}?`} subtitle={kind === "contact" ? "Their saved dates go too. Gifts you've logged are kept." : "This can't be undone."}>
        <div className="mt-2 flex items-center justify-end gap-3">
          <button type="button" className="dy-link" onClick={() => setConfirming(false)} disabled={pending}>Keep</button>
          <button type="button" className="dy-btn dy-btn--paper" onClick={remove} disabled={pending}>{pending ? "Removing…" : "Yes, remove"}</button>
        </div>
      </PaperDialog>
    </>
  );
}

/** The bell on a date: pauses or resumes its reminders. Optimistic, with a quiet failure. */
export function ReminderSwitch({ id, active, label = "Remind me" }: { id: string; active: boolean; label?: string }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Bell className="h-4 w-4 text-[var(--dy-ink-soft)]" aria-hidden="true" />
      <span className="dy-cap whitespace-nowrap">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label}: ${on ? "on" : "off"}`}
        disabled={pending}
        className="dy-switch"
        onClick={() => {
          const next = !on;
          setOn(next);
          startTransition(async () => {
            const result = await setEventActiveAction(id, next);
            if (result.error) { setOn(!next); toast.error(result.error); } else router.refresh();
          });
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ready-made triggers (buttons in the diary's style)
// ---------------------------------------------------------------------------
export const AddPersonButton = ({ size = "sm" }: { size?: "sm" | "md" }) => (
  <PersonDialog trigger={(open) => <button type="button" onClick={open} className={cn("dy-btn", size === "sm" && "dy-btn--sm")}><Plus className="h-4 w-4" aria-hidden="true" /> Add a person</button>} />
);
export const EditPersonButton = ({ contact, photoUrl }: { contact: DiaryContactRow; photoUrl?: string | null }) => (
  <PersonDialog contact={contact} photoUrl={photoUrl} trigger={(open) => <button type="button" onClick={open} className="dy-link inline-flex items-center gap-1"><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>} />
);
export const AddDateButton = ({ people, contactId, contactName, label = "Add a date", variant = "green" }: { people?: PersonOption[]; contactId?: string; contactName?: string; label?: string; variant?: "green" | "paper" }) => (
  <DateDialog people={people} contactId={contactId} contactName={contactName} trigger={(open) => <button type="button" onClick={open} className={cn("dy-btn dy-btn--sm", variant === "paper" && "dy-btn--paper")}><Plus className="h-4 w-4" aria-hidden="true" /> {label}</button>} />
);
export const LogGiftButton = ({ contactId, contactName, defaultEventType, label = "Log a gift", variant = "green" }: { contactId: string; contactName: string; defaultEventType?: string; label?: string; variant?: "green" | "paper" }) => (
  <GiftDialog contactId={contactId} contactName={contactName} defaultEventType={defaultEventType} trigger={(open) => <button type="button" onClick={open} className={cn("dy-btn dy-btn--sm", variant === "paper" && "dy-btn--paper")}><Plus className="h-4 w-4" aria-hidden="true" /> {label}</button>} />
);

/** The first-run call to action: opens "Add someone you love". */
export const OpenDiaryButton = () => (
  <PersonDialog trigger={(open) => <button type="button" onClick={open} className="dy-btn dy-btn--lg dy-btn--sprig">Open my diary <span aria-hidden="true">→</span></button>} />
);

export const EditDateButton = ({ contactId, contactName, event, label }: { contactId: string; contactName: string; event: DiaryEventRow; label: string }) => (
  <DateDialog contactId={contactId} contactName={contactName} event={event} trigger={(open) => <button type="button" onClick={open} className="dy-cap inline-flex items-center gap-1 hover:text-[var(--gp-copper)]" aria-label={`Edit ${label}`}><Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit</button>} />
);

/** Under a person's empty polaroid: opens their page's edit dialog, where a photo can be added. */
export const AddPhotoButton = ({ contact }: { contact: DiaryContactRow }) => (
  <PersonDialog contact={contact} trigger={(open) => <button type="button" onClick={open} className="dy-link inline-flex items-center gap-1"><Camera className="h-3.5 w-3.5" aria-hidden="true" /> Add a photo</button>} />
);

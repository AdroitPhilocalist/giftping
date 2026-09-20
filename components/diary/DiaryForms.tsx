"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellOff, Gift, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import {
  deleteContactAction, deleteEventAction, deleteGiftAction, logGiftAction, saveContactAction, saveEventAction, setEventActiveAction,
} from "@/lib/diary/actions";
import type { DiaryContactRow, DiaryEventRow } from "@/lib/diary/view";
import { EVENT_TYPES, EVENT_TYPE_LABEL, RELATIONSHIPS, contactSchema, eventSchema, giftSchema } from "@/lib/validation/diary.schema";
import { cn } from "@/lib/utils/cn";

const REMINDER_PRESETS = [1, 3, 7, 14, 30];
type EventType = (typeof EVENT_TYPES)[number];

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="mt-1 text-xs text-brand-dark/50">{hint}</p> : null}
    </div>
  );
}

function FormFooter({ error, pending, submitLabel, onCancel }: { error: string | null; pending: boolean; submitLabel: string; onCancel: () => void }) {
  return (
    <div className="pt-1">
      {error ? <p role="alert" className="mb-3 text-sm text-red-700">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : submitLabel}</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Person
// ---------------------------------------------------------------------------
export function ContactDialog({ contact, trigger }: { contact?: DiaryContactRow; trigger: "add" | "edit" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    name: contact?.name ?? "",
    relationship: contact?.relationship ?? "",
    interests: contact?.interests.join(", ") ?? "",
    budgetMax: contact?.budget_max ? String(contact.budget_max) : "",
    giftPreferences: contact?.gift_preferences ?? "",
    notes: contact?.notes ?? "",
    isFavorite: contact?.is_favorite ?? false,
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the details.");
    startTransition(async () => {
      const result = await saveContactAction(form, contact?.id);
      if (result.error) return setError(result.error);
      toast.success(contact ? "Saved." : `${form.name.trim()} is in your diary.`);
      setOpen(false);
      if (!contact && result.id) router.push(`/diary/people/${result.id}`);
      else router.refresh();
    });
  }

  return (
    <>
      {trigger === "add" ? (
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add a person</Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={contact ? `Edit ${contact.name}` : "Add someone you love"} description="Only you can see your diary — not even GiftPing's team.">
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Name" htmlFor="c-name"><Input id="c-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} autoFocus /></Field>
          <Field label="Relationship" htmlFor="c-rel">
            <Select id="c-rel" value={form.relationship} onChange={(e) => set("relationship", e.target.value)}>
              <option value="">Choose…</option>
              {RELATIONSHIPS.map((r) => <option key={r}>{r}</option>)}
            </Select>
          </Field>
          <Field label="Interests" htmlFor="c-int" hint="Separate with commas — e.g. coffee, books, travel. The more we know, the better the gift ideas.">
            <Input id="c-int" value={form.interests} onChange={(e) => set("interests", e.target.value)} placeholder="coffee, gardening, poetry" />
          </Field>
          <Field label="Usual budget (₹, optional)" htmlFor="c-bud"><Input id="c-bud" inputMode="numeric" value={form.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} placeholder="2000" /></Field>
          <Field label="Gift preferences (optional)" htmlFor="c-pref"><Textarea id="c-pref" value={form.giftPreferences} maxLength={500} onChange={(e) => set("giftPreferences", e.target.value)} placeholder="Loves handmade things; allergic to lilies…" /></Field>
          <Field label="Private notes (optional)" htmlFor="c-notes"><Textarea id="c-notes" value={form.notes} maxLength={1000} onChange={(e) => set("notes", e.target.value)} /></Field>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70">
            <input type="checkbox" checked={form.isFavorite} onChange={(e) => set("isFavorite", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Mark as a favourite
          </label>
          <FormFooter error={error} pending={pending} submitLabel={contact ? "Save" : "Add to diary"} onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Important date
// ---------------------------------------------------------------------------
export function EventDialog({ contactId, contactName, event, trigger }: { contactId: string; contactName: string; event?: DiaryEventRow; trigger: "add" | "edit" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => ({
    eventType: (event?.event_type ?? "birthday") as EventType,
    title: event?.title ?? "",
    eventDate: event?.event_date ?? "",
    isRecurring: event?.is_recurring ?? true,
    reminderDays: event?.reminder_days ?? [7, 3],
    notes: event?.notes ?? "",
  }));
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleDay = (d: number) => set("reminderDays", form.reminderDays.includes(d) ? form.reminderDays.filter((x) => x !== d) : [...form.reminderDays, d]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = { contactId, ...form };
    const parsed = eventSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Please check the details.");
    startTransition(async () => {
      const result = await saveEventAction(payload, event?.id);
      if (result.error) return setError(result.error);
      toast.success(event ? "Saved." : "Date saved — we'll remind you in time.");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      {trigger === "add" ? (
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Add a date</Button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1 text-xs text-brand-dark/60 hover:text-brand-primary"><Pencil className="h-3 w-3" /> Edit</button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={event ? "Edit date" : `A date for ${contactName}`}>
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <Field label="Occasion" htmlFor="e-type">
            <Select id="e-type" value={form.eventType} onChange={(e) => set("eventType", e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}
            </Select>
          </Field>
          {form.eventType === "other" || form.eventType === "festival" ? (
            <Field label="What is it?" htmlFor="e-title"><Input id="e-title" value={form.title} maxLength={80} onChange={(e) => set("title", e.target.value)} placeholder="Raksha Bandhan" /></Field>
          ) : null}
          <Field label="Date" htmlFor="e-date" hint={form.isRecurring ? "For birthdays and anniversaries use the original date — we work out the next one each year." : undefined}>
            <Input id="e-date" type="date" value={form.eventDate} onChange={(e) => set("eventDate", e.target.value)} min="1900-01-01" max="2200-12-31" />
          </Field>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => set("isRecurring", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Repeats every year
          </label>
          <div>
            <Label>Remind me</Label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_PRESETS.map((d) => (
                <button key={d} type="button" onClick={() => toggleDay(d)} aria-pressed={form.reminderDays.includes(d)}
                  className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors", form.reminderDays.includes(d) ? "border-brand-primary bg-brand-primary text-brand-light" : "border-brand-dark/15 text-brand-dark hover:border-brand-primary/40")}>
                  {d === 1 ? "1 day" : `${d} days`} before
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-brand-dark/50">Up to four. Choose none to keep the date without reminders.</p>
          </div>
          <Field label="Notes (optional)" htmlFor="e-notes"><Textarea id="e-notes" value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} /></Field>
          <FormFooter error={error} pending={pending} submitLabel="Save date" onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Gift log
// ---------------------------------------------------------------------------
export function GiftDialog({ contactId, contactName, defaultEventType, label = "I gave a gift" }: { contactId: string; contactName: string; defaultEventType?: string; label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ giftName: "", eventType: defaultEventType ?? "", amount: "", giftedOn: "", notes: "" });
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
      setForm({ giftName: "", eventType: defaultEventType ?? "", amount: "", giftedOn: "", notes: "" });
      router.refresh();
    });
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}><Gift className="h-3.5 w-3.5" /> {label}</Button>
      <Modal open={open} onOpenChange={setOpen} title={`A gift for ${contactName}`} description="Bought elsewhere? Log it here so we don't suggest the same thing twice.">
        <form onSubmit={submit} noValidate className="space-y-4">
          <Field label="What did you give?" htmlFor="g-name"><Input id="g-name" value={form.giftName} maxLength={120} onChange={(e) => set("giftName", e.target.value)} autoFocus /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Occasion" htmlFor="g-type">
              <Select id="g-type" value={form.eventType} onChange={(e) => set("eventType", e.target.value)}>
                <option value="">—</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{EVENT_TYPE_LABEL[t]}</option>)}
              </Select>
            </Field>
            <Field label="Date" htmlFor="g-date"><Input id="g-date" type="date" value={form.giftedOn} onChange={(e) => set("giftedOn", e.target.value)} /></Field>
          </div>
          <Field label="Amount spent (₹, optional)" htmlFor="g-amt"><Input id="g-amt" inputMode="numeric" value={form.amount} onChange={(e) => set("amount", e.target.value)} /></Field>
          <Field label="Notes (optional)" htmlFor="g-notes"><Textarea id="g-notes" value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} placeholder="She loved it!" /></Field>
          <FormFooter error={error} pending={pending} submitLabel="Log gift" onCancel={() => setOpen(false)} />
        </form>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Small actions
// ---------------------------------------------------------------------------
export function DeleteButton({ kind, id, name }: { kind: "contact" | "event" | "gift"; id: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function remove() {
    startTransition(async () => {
      const action = kind === "contact" ? deleteContactAction : kind === "event" ? deleteEventAction : deleteGiftAction;
      const result = await action(id);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed.");
      setConfirming(false);
      if (kind === "contact") router.push("/diary");
      else router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setConfirming(true)} aria-label={`Remove ${name}`} className="flex items-center gap-1 text-xs text-brand-dark/50 hover:text-red-700">
        <Trash2 className="h-3 w-3" /> Remove
      </button>
      <Modal open={confirming} onOpenChange={setConfirming} title={`Remove ${name}?`} description={kind === "contact" ? "This also removes their saved dates. Gifts you've logged are kept." : "This can't be undone."}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Keep</Button>
          <Button size="sm" onClick={remove} disabled={pending} className="bg-red-700 hover:bg-red-800">{pending ? "Removing…" : "Remove"}</Button>
        </div>
      </Modal>
    </>
  );
}

export function ReminderToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => {
        const result = await setEventActiveAction(id, !active);
        if (result.error) toast.error(result.error);
        else router.refresh();
      })}
      className="flex items-center gap-1 text-xs text-brand-dark/60 hover:text-brand-primary"
    >
      {active ? <><Bell className="h-3 w-3" /> Reminders on</> : <><BellOff className="h-3 w-3" /> Paused</>}
    </button>
  );
}

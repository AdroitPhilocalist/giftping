"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { saveThemeScheduleAction } from "@/lib/admin/theme-actions";
import { themeScheduleSchema } from "@/lib/validation/theme-schedule.schema";
import type { ThemeDef } from "@/lib/theme/themes";

export interface ThemeScheduleFormValues {
  id?: string;
  themeId: string;
  note: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
}

export function ThemeScheduleDialog({ themes, initial }: { themes: ThemeDef[]; initial?: ThemeScheduleFormValues }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ThemeScheduleFormValues>(initial ?? { themeId: themes[0]?.id ?? "", note: "", startsOn: "", endsOn: "", isActive: true });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof ThemeScheduleFormValues>(k: K, v: ThemeScheduleFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { id: _id, ...rest } = form;
    void _id;
    const parsed = themeScheduleSchema.safeParse(rest);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveThemeScheduleAction(rest, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Schedule saved." : "Theme scheduled.");
      setOpen(false);
      router.refresh();
    });
  }

  const field = (label: string, id: string, node: React.ReactNode, hint?: string) => (
    <div><Label htmlFor={id}>{label}</Label>{node}{hint ? <p className="mt-1 text-xs text-brand-dark/50">{hint}</p> : null}</div>
  );

  return (
    <>
      {editing ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-brand-primary underline">Edit</button>
      ) : (
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Schedule a theme</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? "Edit schedule" : "Schedule a theme"} className="max-w-md">
        <form onSubmit={submit} noValidate className="space-y-4">
          {field("Theme", "th-id", (
            <Select id="th-id" value={form.themeId} onChange={(e) => set("themeId", e.target.value)}>
              {themes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          ))}
          {field("Note (for your own reference)", "th-note", <Input id="th-note" value={form.note} maxLength={100} onChange={(e) => set("note", e.target.value)} placeholder="Christmas 2026" />)}
          <div className="grid grid-cols-2 gap-3">
            {field("Starts", "th-from", <Input id="th-from" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />, "Blank = right away.")}
            {field("Ends (inclusive)", "th-until", <Input id="th-until" type="date" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} />, "Blank = until you pause it.")}
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Active</label>
          <p className="flex items-start gap-2 rounded-button bg-brand-accent/50 p-3 text-xs text-brand-dark/70"><CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" /> Dates are India time. If two schedules ever overlap, the one that starts more recently wins — no need to end the old one first.</p>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Schedule"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

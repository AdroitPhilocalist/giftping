"use client";

import { Camera, Plus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monogram } from "../book/Polaroid";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Interests: chips you can add to and remove, with a few common ones to tap
// ---------------------------------------------------------------------------
const SUGGESTED = ["sarees", "flowers", "books", "travel", "coffee", "gardening", "music", "cooking", "jewellery", "fitness", "tech", "art"];
export const MAX_INTERESTS = 15;

export function InterestsInput({ value, onChange, id }: { value: string[]; onChange: (next: string[]) => void; id?: string }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const clean = raw.trim().toLowerCase().slice(0, 30);
    if (!clean || value.includes(clean) || value.length >= MAX_INTERESTS) return;
    onChange([...value, clean]);
  };
  const commit = () => {
    draft.split(",").forEach(add);
    setDraft("");
  };
  const suggestions = SUGGESTED.filter((s) => !value.includes(s)).slice(0, 6);
  return (
    <div>
      <div className="dy-tagbox flex flex-wrap items-center gap-2 p-2">
        {value.map((interest) => (
          <span key={interest} className="dy-chip dy-chip--tag !cursor-default">
            {interest}
            <button type="button" onClick={() => onChange(value.filter((v) => v !== interest))} aria-label={`Remove ${interest}`} className="grid place-items-center rounded-full opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
            else if (e.key === "Backspace" && draft === "" && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={commit}
          disabled={value.length >= MAX_INTERESTS}
          placeholder={value.length ? "Add another…" : "coffee, gardening, poetry…"}
          className="dy-hand min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-[1.15rem] outline-none placeholder:text-[var(--dy-ink-soft)]"
          aria-label="Add an interest"
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Suggestions">
          {suggestions.map((s) => (
            <button key={s} type="button" className="dy-chip !py-0.5 !text-[1.05rem]" onClick={() => add(s)}><Plus className="h-3 w-3" aria-hidden="true" />{s}</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Budget: a slider over sensible steps plus the exact figure
// ---------------------------------------------------------------------------
const STEPS = [500, 1000, 1500, 2000, 3000, 5000, 7500, 10000];
const nearestStep = (n: number) => STEPS.reduce((best, s, i) => (Math.abs(s - n) < Math.abs(STEPS[best] - n) ? i : best), 0);

export function BudgetField({ value, onChange, id }: { value: string; onChange: (next: string) => void; id?: string }) {
  const amount = Number(value);
  const index = value && Number.isFinite(amount) && amount > 0 ? nearestStep(amount) : 3;
  const fill = `${(index / (STEPS.length - 1)) * 100}%`;
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <input type="range" min={0} max={STEPS.length - 1} step={1} value={index} onChange={(e) => onChange(String(STEPS[Number(e.target.value)]))} className="dy-range" style={{ ["--fill" as string]: fill }} aria-label="Usual budget" />
          <div className="dy-cap mt-1 flex justify-between"><span>₹500</span><span>₹2,000</span><span>₹5,000</span><span>₹10,000+</span></div>
        </div>
        <div className="relative w-[7.2rem] shrink-0">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-[var(--dy-ink-soft)]">₹</span>
          <input id={id} inputMode="numeric" value={value} onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, "").slice(0, 8))} placeholder="2000" className="dy-field !pl-6 text-right" aria-label="Usual budget in rupees" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Photo: a polaroid preview and a button to choose a picture
// ---------------------------------------------------------------------------
export function PhotoPicker({ name, currentUrl, file, onFile, removed, onRemove }: { name: string; currentUrl?: string | null; file: File | null; onFile: (file: File | null) => void; removed?: boolean; onRemove?: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const shown = preview ?? (removed ? null : currentUrl ?? null);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="dy-polaroid !p-1.5 !pb-1" style={{ ["--tilt" as string]: "3deg", width: "6.6rem" }}>
        <span className="dy-tape dy-tape--blush" style={{ top: "-0.55rem", left: "50%", marginLeft: "-1.6rem", ["--tape-w" as string]: "3.2rem" }} aria-hidden="true" />
        <span className="dy-polaroid-photo block">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local preview / private signed URL: never through the image optimiser */}
          {shown ? <img src={shown} alt={`Photo of ${name || "them"}`} /> : <Monogram name={name || "?"} size="2.6rem" />}
        </span>
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ""; }} aria-label="Choose a photo" tabIndex={-1} />
      <button type="button" className="dy-link inline-flex items-center gap-1" onClick={() => input.current?.click()}><Camera className="h-3.5 w-3.5" aria-hidden="true" />{shown ? "Change photo" : "Add a photo"}</button>
      {shown && onRemove ? <button type="button" className="dy-cap underline-offset-2 hover:underline" onClick={() => { onFile(null); onRemove(); }}>Remove</button> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Choice chips (single select) — relationship, occasion of a gift…
// ---------------------------------------------------------------------------
export function ChipChoice<T extends string>({ options, value, onChange, allowClear = true, label }: { options: readonly T[]; value: T | ""; onChange: (next: T | "") => void; allowClear?: boolean; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button" className="dy-chip" aria-pressed={value === o} onClick={() => onChange(value === o && allowClear ? "" : o)}>{o}</button>
      ))}
    </div>
  );
}

export function SwitchRow({ id, checked, onChange, label, hint, icon }: { id: string; checked: boolean; onChange: (next: boolean) => void; label: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon ? <span className="shrink-0" aria-hidden="true">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="dy-hand-b block text-[1.3rem] leading-[1.05]">{label}</label>
        {hint ? <p className="dy-hint !mt-0">{hint}</p> : null}
      </div>
      <button id={id} type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="dy-switch" />
    </div>
  );
}

export function FormButtons({ pending, submitLabel, onCancel, tone = "copper" }: { pending: boolean; submitLabel: string; onCancel: () => void; tone?: "copper" | "green" }) {
  return (
    <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
      <button type="button" className="dy-link" onClick={onCancel} disabled={pending}>Cancel</button>
      <button type="submit" disabled={pending} className={cn("dy-btn dy-btn--lg dy-btn--sprig", tone === "copper" && "dy-btn--copper")}>{pending ? "Saving…" : submitLabel} <span aria-hidden="true">→</span></button>
    </div>
  );
}

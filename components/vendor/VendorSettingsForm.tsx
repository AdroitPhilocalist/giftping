"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { updateVendorSettingsAction, type VendorSettingsInput } from "@/lib/vendor/settings-actions";

const Field = ({ label, id, children }: { label: string; id: string; children: React.ReactNode }) => <div><Label htmlFor={id}>{label}</Label>{children}</div>;

export function VendorSettingsForm({ initial }: { initial: Required<VendorSettingsInput> }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const r = await updateVendorSettingsAction(form);
          if (!r.ok) {
            setError(r.error ?? "Something went wrong.");
            return;
          }
          toast.success(r.note ?? "Saved.");
        });
      }}
    >
      <fieldset className="space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-5">
        <legend className="px-1 font-heading text-lg text-brand-dark">Your boutique</legend>
        <Field label="Tagline" id="s-tag"><Input id="s-tag" value={form.shortDescription ?? ""} maxLength={120} onChange={(e) => set("shortDescription", e.target.value)} /></Field>
        <Field label="Brand story" id="s-desc"><Textarea id="s-desc" value={form.description} maxLength={1500} onChange={(e) => set("description", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Support email" id="s-mail"><Input id="s-mail" type="email" value={form.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} /></Field>
          <Field label="Support phone (10 digits — also used to register your courier pickup)" id="s-phone"><Input id="s-phone" inputMode="tel" value={form.supportPhone} onChange={(e) => set("supportPhone", e.target.value)} /></Field>
        </div>
      </fieldset>
      <fieldset className="space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-5">
        <legend className="px-1 font-heading text-lg text-brand-dark">Pickup address</legend>
        <p className="-mt-2 text-xs text-brand-dark/50">Where couriers collect your parcels. Changing it re-registers your pickup with the courier at your next booking.</p>
        <Field label="Address" id="s-l1"><Input id="s-l1" value={form.warehouseLine1} onChange={(e) => set("warehouseLine1", e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" id="s-city"><Input id="s-city" value={form.warehouseCity} onChange={(e) => set("warehouseCity", e.target.value)} /></Field>
          <Field label="State" id="s-state"><Input id="s-state" value={form.warehouseState} onChange={(e) => set("warehouseState", e.target.value)} /></Field>
          <Field label="Pincode" id="s-pin"><Input id="s-pin" inputMode="numeric" maxLength={6} value={form.warehousePincode} onChange={(e) => set("warehousePincode", e.target.value)} /></Field>
        </div>
      </fieldset>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
    </form>
  );
}

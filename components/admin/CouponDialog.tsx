"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { saveCouponAction } from "@/lib/admin/coupon-actions";
import { couponSchema } from "@/lib/validation/coupon.schema";

export interface CouponFormValues {
  id?: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: string;
  minOrderAmount: string;
  maxDiscountAmount: string;
  usageLimit: string;
  perUserLimit: string;
  vendorId: string;
  categoryId: string;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  used: boolean;
}

export const EMPTY_COUPON: CouponFormValues = {
  code: "", description: "", discountType: "percentage", discountValue: "", minOrderAmount: "", maxDiscountAmount: "", usageLimit: "",
  perUserLimit: "1", vendorId: "", categoryId: "", validFrom: "", validUntil: "", isActive: true, used: false,
};

export function CouponDialog({ initial, vendors, categories }: { initial?: CouponFormValues; vendors: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CouponFormValues>(initial ?? EMPTY_COUPON);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof CouponFormValues>(k: K, v: CouponFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { id: _id, used: _used, ...payload } = form;
    void _id; void _used;
    const parsed = couponSchema.safeParse(payload);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveCouponAction(payload, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Coupon saved." : "Coupon created.");
      setOpen(false);
      if (!editing) setForm(EMPTY_COUPON);
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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New coupon</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? `Edit ${initial?.code}` : "New coupon"} className="max-w-lg">
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {field("Code", "cp-code", <Input id="cp-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} disabled={editing && form.used} maxLength={30} placeholder="WELCOME10" autoFocus />, editing && form.used ? "This coupon has been used, so its code is locked." : "Customers type this at checkout. Letters, numbers, - and _.")}
          {field("Description (internal)", "cp-desc", <Textarea id="cp-desc" value={form.description} maxLength={200} onChange={(e) => set("description", e.target.value)} />)}
          <div className="grid grid-cols-2 gap-3">
            {field("Type", "cp-type", <Select id="cp-type" value={form.discountType} onChange={(e) => set("discountType", e.target.value as "percentage" | "fixed")}><option value="percentage">Percentage off</option><option value="fixed">Fixed ₹ off</option></Select>)}
            {field(form.discountType === "percentage" ? "Percent" : "Amount (₹)", "cp-val", <Input id="cp-val" inputMode="decimal" value={form.discountValue} onChange={(e) => set("discountValue", e.target.value)} />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Minimum order (₹)", "cp-min", <Input id="cp-min" inputMode="decimal" value={form.minOrderAmount} onChange={(e) => set("minOrderAmount", e.target.value)} placeholder="0" />, "Judged on the items the coupon applies to.")}
            {form.discountType === "percentage" ? field("Maximum discount (₹)", "cp-max", <Input id="cp-max" inputMode="decimal" value={form.maxDiscountAmount} onChange={(e) => set("maxDiscountAmount", e.target.value)} placeholder="no cap" />) : <span />}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Total uses (all customers)", "cp-use", <Input id="cp-use" inputMode="numeric" value={form.usageLimit} onChange={(e) => set("usageLimit", e.target.value)} placeholder="unlimited" />)}
            {field("Uses per customer", "cp-per", <Input id="cp-per" inputMode="numeric" value={form.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} />)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Only this boutique", "cp-vendor", <Select id="cp-vendor" value={form.vendorId} onChange={(e) => set("vendorId", e.target.value)}><option value="">All boutiques</option>{vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</Select>, "A boutique-scoped coupon is paid for by that boutique.")}
            {field("Only this category", "cp-cat", <Select id="cp-cat" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}><option value="">All categories</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {field("Starts", "cp-from", <Input id="cp-from" type="date" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} />, "Blank = now.")}
            {field("Ends (inclusive)", "cp-until", <Input id="cp-until" type="date" value={form.validUntil} onChange={(e) => set("validUntil", e.target.value)} />, "Blank = never.")}
          </div>
          <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Active</label>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Create coupon"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

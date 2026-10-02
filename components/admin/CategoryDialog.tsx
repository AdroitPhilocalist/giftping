"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { toast } from "@/components/ui/Toast";
import { saveCategoryAction } from "@/lib/admin/category-actions";
import { categorySchema } from "@/lib/validation/category.schema";

export interface CategoryFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  themeColor: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  isFeatured: boolean;
}

const DEFAULT_SWATCH = "#1A4731"; // theme-safe: fallback for a per-category colour the admin sets and stores in the DB, not a brand token
const EMPTY: CategoryFormValues = { name: "", slug: "", description: "", themeColor: DEFAULT_SWATCH, metaTitle: "", metaDescription: "", isActive: true, isFeatured: false };

// "Birthday" -> "birthday", "Corporate Gifting" -> "corporate-gifting" — a starting point the admin can still edit.
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

export function CategoryDialog({ initial }: { initial?: CategoryFormValues }) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CategoryFormValues>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(editing); // once editing an existing category, typing the name should never silently rewrite its slug
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof CategoryFormValues>(k: K, v: CategoryFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { id: _id, ...rest } = form;
    void _id;
    const parsed = categorySchema.safeParse(rest);
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveCategoryAction(rest, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Category saved." : "Category created.");
      setOpen(false);
      if (!editing) { setForm(EMPTY); setSlugTouched(false); }
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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New category</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? "Edit category" : "New category"} className="max-w-lg">
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-[1fr_auto] items-end gap-3">
            {field("Name", "cat-name", <Input id="cat-name" value={form.name} maxLength={60} onChange={(e) => { const name = e.target.value; set("name", name); if (!slugTouched) set("slug", slugify(name)); }} placeholder="Housewarming" />)}
            <div className="shrink-0"><Label htmlFor="cat-color">Colour</Label><input id="cat-color" type="color" value={form.themeColor || DEFAULT_SWATCH} onChange={(e) => set("themeColor", e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-brand-dark/15 bg-transparent p-1" /></div>
          </div>
          {field("Slug", "cat-slug", <Input id="cat-slug" value={form.slug} maxLength={60} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="housewarming" />, `Shown in the URL as /categories/${form.slug || "…"}. Changing an existing category's slug breaks any links already pointing at the old one.`)}
          {field("Description", "cat-desc", <Textarea id="cat-desc" value={form.description} maxLength={300} onChange={(e) => set("description", e.target.value)} placeholder="For a new home and the people filling it." />)}
          {field("Meta title", "cat-mt", <Input id="cat-mt" value={form.metaTitle} maxLength={70} onChange={(e) => set("metaTitle", e.target.value)} />, "For search engines. Blank uses the category name.")}
          {field("Meta description", "cat-md", <Textarea id="cat-md" value={form.metaDescription} maxLength={160} onChange={(e) => set("metaDescription", e.target.value)} />, "For search engines. Blank uses the description above.")}
          <div className="flex flex-wrap gap-5">
            <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Active (visible on the storefront)</label>
            <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Featured on the homepage</label>
          </div>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Create category"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

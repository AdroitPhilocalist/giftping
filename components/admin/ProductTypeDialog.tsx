"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";
import { saveProductTypeAction } from "@/lib/admin/product-type-actions";
import { parseAttributeOptions, productAttributeSchema, productTypeSchema } from "@/lib/validation/product-type.schema";
import type { ProductTypeTreeNode } from "@/lib/catalog/product-types";

export interface AttributeRowValues {
  id?: string;
  key: string;
  label: string;
  inputType: "select" | "multi_select";
  optionsText: string; // comma-separated; parsed via parseAttributeOptions on submit
}

export interface ProductTypeFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  iconUrl: string;
  metaTitle: string;
  metaDescription: string;
  isActive: boolean;
  parentId: string; // "" for top-level
  attributes: AttributeRowValues[];
}

// The full list of possible parents is the same for every row on the page, so it is handed down ONCE through context rather than as a prop of each row's
// dialog — with hundreds of product types, a per-row copy would multiply the page's size by the number of rows.
const ParentOptionsContext = createContext<ProductTypeTreeNode[]>([]);
export function ParentOptionsProvider({ options, children }: { options: ProductTypeTreeNode[]; children: React.ReactNode }) {
  return <ParentOptionsContext.Provider value={options}>{children}</ParentOptionsContext.Provider>;
}

const EMPTY: ProductTypeFormValues = { name: "", slug: "", description: "", iconUrl: "", metaTitle: "", metaDescription: "", isActive: true, parentId: "", attributes: [] };
const EMPTY_ATTR: AttributeRowValues = { key: "", label: "", inputType: "select", optionsText: "" };

// "Flavor" -> "flavor", "Metal Type" -> "metal_type" — a starting point the admin can still edit.
const keyify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/**
 * Create/edit a product type, same dialog pattern as CategoryDialog — plus an inline attribute-rows editor
 * (key/label/input type/options), since a type and its attributes are edited and saved together in one call
 * (see saveProductTypeAction's own doc comment for why: there's no real moment where they're separate).
 */
export function ProductTypeDialog({ initial, excludedIds = [] }: { initial?: ProductTypeFormValues; /** this type and everything beneath it — none of them can become its parent */ excludedIds?: string[] }) {
  const router = useRouter();
  const parentOptions = useContext(ParentOptionsContext);
  const editing = Boolean(initial?.id);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductTypeFormValues>(initial ?? EMPTY);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof ProductTypeFormValues>(k: K, v: ProductTypeFormValues[K]) => setForm((f) => ({ ...f, [k]: v }));

  const setAttr = (i: number, patch: Partial<AttributeRowValues>) =>
    setForm((f) => ({ ...f, attributes: f.attributes.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));
  const addAttr = () => setForm((f) => ({ ...f, attributes: [...f.attributes, { ...EMPTY_ATTR }] }));
  const removeAttr = (i: number) => setForm((f) => ({ ...f, attributes: f.attributes.filter((_, idx) => idx !== i) }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { id: _id, attributes, ...rest } = form;
    void _id;
    const parsedType = productTypeSchema.safeParse(rest);
    if (!parsedType.success) return setError(parsedType.error.issues[0]?.message ?? "Check the details.");

    const attrPayload = attributes.map((a) => ({ id: a.id, key: a.key, label: a.label, inputType: a.inputType, options: parseAttributeOptions(a.optionsText) }));
    for (const a of attrPayload) {
      const p = productAttributeSchema.safeParse(a);
      if (!p.success) return setError(p.error.issues[0]?.message ?? "Check the attribute details.");
    }

    startTransition(async () => {
      const result = await saveProductTypeAction(rest, attrPayload, form.id);
      if (result.error) return setError(result.error);
      toast.success(editing ? "Product type saved." : "Product type created.");
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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New product type</Button>
      )}
      <Modal open={open} onOpenChange={setOpen} title={editing ? "Edit product type" : "New product type"} className="max-w-xl">
        <form onSubmit={submit} noValidate className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {field("Name", "pt-name", <Input id="pt-name" value={form.name} maxLength={60} onChange={(e) => { const name = e.target.value; set("name", name); if (!slugTouched) set("slug", slugify(name)); }} placeholder="Jewellery" />)}
          {field("Slug", "pt-slug", <Input id="pt-slug" value={form.slug} maxLength={60} onChange={(e) => { setSlugTouched(true); set("slug", e.target.value); }} placeholder="jewellery" />, `Shown in the URL as /shop/${form.slug || "…"}.`)}
          {field(
            "Parent category",
            "pt-parent",
            <Select id="pt-parent" value={form.parentId} onChange={(e) => set("parentId", e.target.value)}>
              <option value="">None — a top-level category</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id} disabled={excludedIds.includes(p.id)}>
                  {"— ".repeat(p.depth)}{p.name}{excludedIds.includes(p.id) ? " (can't nest under itself)" : ""}
                </option>
              ))}
            </Select>,
            "Leave blank for a top-level category like \"Jewellery\"; pick one to make this a subcategory like \"Necklaces\".",
          )}
          {field("Description", "pt-desc", <Textarea id="pt-desc" value={form.description} maxLength={300} onChange={(e) => set("description", e.target.value)} />)}
          {field("Meta title", "pt-mt", <Input id="pt-mt" value={form.metaTitle} maxLength={70} onChange={(e) => set("metaTitle", e.target.value)} />, "For search engines. Blank uses the name.")}
          {field("Meta description", "pt-md", <Textarea id="pt-md" value={form.metaDescription} maxLength={160} onChange={(e) => set("metaDescription", e.target.value)} />, "For search engines. Blank uses the description above.")}
          <label className="flex items-center gap-2 text-sm text-brand-dark/70"><input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="h-4 w-4 accent-brand-primary" /> Active (visible on the storefront)</label>

          <div className="border-t border-brand-dark/10 pt-3">
            <p className="text-sm font-medium text-brand-dark">Attributes</p>
            <p className="mt-0.5 text-xs text-brand-dark/50">
              Filterable features specific to this category — e.g. &ldquo;Flavor&rdquo; on Chocolates &amp; Sweets, &ldquo;Placement&rdquo; on Flowers &amp; Plants. A subcategory also inherits everything defined here.
            </p>
            <div className="mt-3 space-y-3">
              {form.attributes.map((a, i) => (
                <div key={i} className="rounded-xl border border-brand-dark/10 p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={a.label} maxLength={40} placeholder="Flavor" onChange={(e) => { const label = e.target.value; setAttr(i, { label, key: a.key === keyify(a.label) ? keyify(label) : a.key }); }} aria-label="Attribute label" />
                    <Select value={a.inputType} onChange={(e) => setAttr(i, { inputType: e.target.value as AttributeRowValues["inputType"] })} aria-label="Attribute input type">
                      <option value="select">Pick one</option>
                      <option value="multi_select">Pick several</option>
                    </Select>
                  </div>
                  <Input className="mt-2" value={a.optionsText} placeholder="Chocolate, Vanilla, Red Velvet" onChange={(e) => setAttr(i, { optionsText: e.target.value })} aria-label="Attribute options, comma-separated" />
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-[11px] text-brand-dark/40">Key: {a.key || keyify(a.label) || "…"}</p>
                    <button type="button" onClick={() => removeAttr(i)} className="flex items-center gap-1 text-xs text-brand-dark/50 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                  </div>
                </div>
              ))}
            </div>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={addAttr}><Plus className="h-4 w-4" /> Add attribute</Button>
          </div>

          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : editing ? "Save" : "Create product type"}</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { EngravingPlacementEditor } from "@/components/vendor/EngravingPlacementEditor";
import { DEFAULT_ENGRAVING, ENGRAVING_STYLES, normaliseEngraving, type EngravingConfig, type EngravingPlacement } from "@/lib/personalization/engraving";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { saveProductAction } from "@/lib/vendor/actions";
import { productSchema, type ProductFormInput, type ProductInput } from "@/lib/validation/product.schema";
import { OCCASION_TAGS, RECIPIENT_TAGS, labelForTag } from "@/lib/catalog/tags";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-brand-dark/10 bg-brand-surface p-5">
      <legend className="px-1 font-heading text-lg text-brand-dark">{title}</legend>
      {children}
    </fieldset>
  );
}

export function ProductForm({
  productId,
  categories,
  defaultValues,
  primaryImageUrl,
}: {
  productId: string | null;
  categories: { id: string; name: string }[];
  defaultValues?: Partial<ProductFormInput>;
  /** the product's main photo — the engraving editor draws on it (null until a photo has been uploaded) */
  primaryImageUrl?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      gstRate: 18,
      stockQuantity: 0,
      occasionTags: [],
      recipientTags: [],
      variants: [],
      ...defaultValues,
      engraving: { enabled: false, ...DEFAULT_ENGRAVING, ...defaultValues?.engraving },
    },
  });
  const [sample, setSample] = useState("Aarav Nair");
  const eng = useWatch({ control, name: "engraving" });
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : d);
  // The live config the editor draws from (the form holds strings for number inputs, so coerce).
  const engConfig: EngravingConfig = {
    label: (eng?.label ?? DEFAULT_ENGRAVING.label) || DEFAULT_ENGRAVING.label,
    maxLength: num(eng?.maxLength, DEFAULT_ENGRAVING.maxLength),
    required: eng?.required ?? true,
    style: (eng?.style ?? DEFAULT_ENGRAVING.style) as EngravingConfig["style"],
    x: num(eng?.x, DEFAULT_ENGRAVING.x),
    y: num(eng?.y, DEFAULT_ENGRAVING.y),
    w: num(eng?.w, DEFAULT_ENGRAVING.w),
    h: num(eng?.h, DEFAULT_ENGRAVING.h),
    rotate: num(eng?.rotate, 0),
  };
  const applyPlacement = (p: EngravingPlacement) => {
    for (const k of ["x", "y", "w", "h", "rotate"] as const) setValue(`engraving.${k}`, p[k], { shouldDirty: true });
  };
  const sampleCheck = normaliseEngraving(sample, { label: engConfig.label, maxLength: engConfig.maxLength, required: false });
  // keyName: useFieldArray otherwise uses "id" as its internal key, which would clobber each variant's real DB id.
  const variants = useFieldArray({ control, name: "variants", keyName: "fieldKey" });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveProductAction(productId, values as ProductFormInput);
      if (result.error) {
        setServerError(result.error);
        return;
      }
      toast(productId ? "Saved — it'll be re-reviewed before going live." : "Product created — now add photos.");
      if (productId === null && result.id) {
        router.push(`/vendor/products/${result.id}`);
      } else {
        router.refresh();
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Basics">
        <div>
          <Label htmlFor="name">Product name</Label>
          <Input id="name" {...register("name")} />
          <FieldError message={errors.name?.message} />
        </div>
        <div>
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" defaultValue="" {...register("categoryId")}>
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <FieldError message={errors.categoryId?.message} />
        </div>
        <div>
          <Label htmlFor="shortDescription">Short description</Label>
          <Input id="shortDescription" {...register("shortDescription")} />
          <FieldError message={errors.shortDescription?.message} />
        </div>
        <div>
          <Label htmlFor="description">Full description</Label>
          <Textarea id="description" className="min-h-32" {...register("description")} />
          <FieldError message={errors.description?.message} />
        </div>
      </Section>

      <Section title="Pricing & stock">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="basePrice">Price (₹)</Label>
            <Input id="basePrice" type="number" step="0.01" min="0" {...register("basePrice")} />
            <FieldError message={errors.basePrice?.message} />
          </div>
          <div>
            <Label htmlFor="salePrice">Sale price (₹, optional)</Label>
            <Input id="salePrice" type="number" step="0.01" min="0" {...register("salePrice")} />
            <FieldError message={errors.salePrice?.message} />
          </div>
          <div>
            <Label htmlFor="stockQuantity">Stock</Label>
            <Input id="stockQuantity" type="number" min="0" {...register("stockQuantity")} />
            <FieldError message={errors.stockQuantity?.message} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register("sku")} />
            <FieldError message={errors.sku?.message} />
          </div>
          <div>
            <Label htmlFor="weightGrams">Weight (g)</Label>
            <Input id="weightGrams" type="number" min="0" {...register("weightGrams")} />
          </div>
          <div>
            <Label htmlFor="gstRate">GST %</Label>
            <Input id="gstRate" type="number" step="0.01" min="0" max="28" {...register("gstRate")} />
          </div>
          <div>
            <Label htmlFor="hsnCode">HSN code</Label>
            <Input id="hsnCode" {...register("hsnCode")} />
          </div>
        </div>
      </Section>

      <Section title="Who & when is it for?">
        <div>
          <Label>Occasions</Label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {OCCASION_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-sm text-brand-dark/80">
                <input type="checkbox" value={tag} className="h-4 w-4" {...register("occasionTags")} />
                {labelForTag(tag)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label>Recipients</Label>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {RECIPIENT_TAGS.map((tag) => (
              <label key={tag} className="flex items-center gap-2 text-sm text-brand-dark/80">
                <input type="checkbox" value={tag} className="h-4 w-4" {...register("recipientTags")} />
                {labelForTag(tag)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="tags">Search keywords (comma separated)</Label>
          <Input id="tags" placeholder="hamper, premium, leather" {...register("tags")} />
        </div>
      </Section>

      <Section title="Personalised text on the photo (optional)">
        <p className="text-sm text-brand-dark/60">For products a customer can have a name or short line put on (an engraved plate, a printed box). Shoppers type their text and watch it appear on your photo before they buy; you then receive the exact words with the order.</p>
        <label className="flex items-center gap-2 text-sm font-medium text-brand-dark">
          <input type="checkbox" className="h-4 w-4 accent-brand-primary" {...register("engraving.enabled")} />
          This product can be personalised with text
        </label>
        {eng?.enabled ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="eng-label">What should the field be called?</Label>
                <Input id="eng-label" maxLength={40} placeholder="Name on the plate" {...register("engraving.label")} />
                <FieldError message={errors.engraving?.label?.message} />
              </div>
              <div>
                <Label htmlFor="eng-max">Longest text allowed (characters)</Label>
                <Input id="eng-max" type="number" min={3} max={60} {...register("engraving.maxLength")} />
                <FieldError message={errors.engraving?.maxLength?.message} />
              </div>
              <div>
                <Label htmlFor="eng-style">Lettering style</Label>
                <Select id="eng-style" {...register("engraving.style")}>
                  {ENGRAVING_STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm text-brand-dark">
                <input type="checkbox" className="h-4 w-4 accent-brand-primary" {...register("engraving.required")} />
                Customers must enter text
              </label>
            </div>

            {primaryImageUrl ? (
              <div className="space-y-3">
                <div className="max-w-md">
                  <Label htmlFor="eng-sample">Try a name (to test how it fits)</Label>
                  <Input id="eng-sample" value={sample} onChange={(e) => setSample(e.target.value)} maxLength={80} />
                  {!sampleCheck.ok ? <p className="mt-1 text-xs text-brand-secondary-dark">{sampleCheck.error} (Customers will be stopped at this limit.)</p> : <p className="mt-1 text-xs text-brand-dark/50">Try the longest name you expect — it shrinks to fit the box.</p>}
                </div>
                <EngravingPlacementEditor imageUrl={primaryImageUrl} config={engConfig} sample={sample} onChange={applyPlacement} />
                <FieldError message={errors.engraving?.x?.message} />
              </div>
            ) : (
              <p className="rounded-xl bg-brand-accent/60 p-3 text-sm text-brand-dark">Add a main photo first (it can be added once the product is saved), then come back here to place the text on it.</p>
            )}
          </div>
        ) : null}
      </Section>

      <Section title="Variants (optional)">
        <p className="-mt-2 text-xs text-brand-dark/50">
          e.g. type &ldquo;Wrapping style&rdquo;, value &ldquo;Royal Blue&rdquo;. Removing a variant hides it rather than
          deleting it, so past orders keep their history.
        </p>
        {variants.fields.map((field, index) => (
          <div key={field.fieldKey} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_110px_90px_auto]">
            <input type="hidden" {...register(`variants.${index}.id`)} />
            <div>
              <Label htmlFor={`variants.${index}.name`}>Type</Label>
              <Input id={`variants.${index}.name`} {...register(`variants.${index}.name`)} />
              <FieldError message={errors.variants?.[index]?.name?.message} />
            </div>
            <div>
              <Label htmlFor={`variants.${index}.value`}>Value</Label>
              <Input id={`variants.${index}.value`} {...register(`variants.${index}.value`)} />
              <FieldError message={errors.variants?.[index]?.value?.message} />
            </div>
            <div>
              <Label htmlFor={`variants.${index}.priceAdjustment`}>Price ±₹</Label>
              <Input id={`variants.${index}.priceAdjustment`} type="number" step="0.01" {...register(`variants.${index}.priceAdjustment`)} />
            </div>
            <div>
              <Label htmlFor={`variants.${index}.stockQuantity`}>Stock</Label>
              <Input id={`variants.${index}.stockQuantity`} type="number" min="0" {...register(`variants.${index}.stockQuantity`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" aria-label="Remove variant" onClick={() => variants.remove(index)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => variants.append({ name: "", value: "", priceAdjustment: 0, stockQuantity: 0 })}
        >
          <Plus className="h-4 w-4" /> Add variant
        </Button>
      </Section>

      {serverError ? <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{serverError}</p> : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Saving…" : productId ? "Save changes" : "Create product"}
      </Button>
    </form>
  );
}

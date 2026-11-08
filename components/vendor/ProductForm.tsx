"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { EngravingPlacementEditor } from "@/components/vendor/EngravingPlacementEditor";
import { DEFAULT_ENGRAVING, ENGRAVING_STYLES, normaliseEngraving, type EngravingConfig, type EngravingPlacement } from "@/lib/personalization/engraving";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { saveProductAction } from "@/lib/vendor/actions";
import { productSchema, type ProductFormInput, type ProductInput } from "@/lib/validation/product.schema";
import { OCCASION_TAGS, RECIPIENT_TAGS, labelForTag } from "@/lib/catalog/tags";
import { ancestorChain, type ProductTypeRow } from "@/lib/catalog/product-types";
import { Button } from "@/components/ui/Button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { toast } from "@/components/ui/Toast";

export interface ProductAttributeOption {
  id: string;
  product_type_id: string;
  key: string;
  label: string;
  input_type: string; // "select" | "multi_select"
  options: string[];
}

/** The first problem react-hook-form found, as "field: message" — so a field the vendor can't see (or an error with no message under it) is still reported. */
function firstFieldError(errors: unknown, path = ""): string | null {
  if (!errors || typeof errors !== "object") return null;
  const node = errors as Record<string, unknown>;
  if (typeof node.message === "string" && node.message) return path ? `${path}: ${node.message}` : node.message;
  for (const [key, value] of Object.entries(node)) {
    if (key === "ref") continue;
    const found = firstFieldError(value, path ? `${path}.${key}` : key);
    if (found) return found;
  }
  return null;
}

/** A single-choice attribute's current answer (the form holds every answer as a list). */
const firstAnswer = (v: unknown): string => (Array.isArray(v) && typeof v[0] === "string" ? v[0] : "");

const TYPE_LEVEL_LABELS = ["Product type", "Subcategory", "Sub-subcategory"];

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
  productTypes,
  productAttributes,
  defaultValues,
  primaryImageUrl,
  willGoOffline = false,
}: {
  productId: string | null;
  categories: { id: string; name: string }[];
  /** the product-type tree (Jewellery, Necklaces, ...) — a separate axis from the occasion categories above */
  productTypes: ProductTypeRow[];
  /** every type's attribute definitions (Flavor, Metal, ...); filtered down to one type's effective set below */
  productAttributes: ProductAttributeOption[];
  defaultValues?: Partial<ProductFormInput>;
  /** the product's main photo — the engraving editor draws on it (null until a photo has been uploaded) */
  primaryImageUrl?: string | null;
  /** true when this is a currently-live product: saving sends it back to review, so the form warns before submit */
  willGoOffline?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ProductFormInput, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      gstRate: 18,
      stockQuantity: 0,
      occasionTags: [],
      recipientTags: [],
      variants: [],
      productTypeId: null,
      attributeValues: {},
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

  // Product type: one cascading select per level of the tree (Jewellery → Necklaces, or Home & Living → Home Decor → Wall Art & Frames), all writing the one
  // `productTypeId`. A level's blank option means "stop here" — the product belongs to that parent type itself.
  const productTypeId = (useWatch({ control, name: "productTypeId" }) ?? null) as string | null;
  const chain = productTypeId ? ancestorChain(productTypes, productTypeId) : [];
  const typeLevels: { label: string; options: ProductTypeRow[]; value: string; parentId: string | null }[] = [];
  for (let parentId: string | null = null, depth = 0; ; depth++) {
    const options = productTypes.filter((t) => (t.parent_id ?? null) === parentId);
    if (options.length === 0) break;
    const picked = chain[depth];
    typeLevels.push({ label: TYPE_LEVEL_LABELS[Math.min(depth, TYPE_LEVEL_LABELS.length - 1)], options, value: picked?.id ?? "", parentId });
    if (!picked) break;
    parentId = picked.id;
  }

  // Effective attribute set = this type's own attributes + every ancestor's (e.g. "Metal" defined on "Jewellery" still applies to a product tagged "Necklaces").
  const attributesFor = (typeId: string | null) => {
    if (!typeId) return [];
    const chainIds = new Set(ancestorChain(productTypes, typeId).map((t) => t.id));
    return productAttributes.filter((a) => chainIds.has(a.product_type_id));
  };
  const effectiveAttributes = attributesFor(productTypeId);
  const attributeValues = useWatch({ control, name: "attributeValues" }) ?? {};

  function chooseTypeAt(depth: number, id: string) {
    const next = id || typeLevels[depth].parentId;
    setValue("productTypeId", next, { shouldDirty: true });
    // Moving between related types (Jewellery → Necklaces) keeps the answers that still apply; only the questions that no longer exist are dropped.
    const stillAsked = new Set(attributesFor(next).map((a) => a.id));
    const answers = Object.entries(getValues("attributeValues") ?? {}).filter(([attributeId]) => stillAsked.has(attributeId));
    setValue("attributeValues", Object.fromEntries(answers), { shouldDirty: true });
  }

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveProductAction(productId, values as ProductFormInput);
      if (result.error) {
        setServerError(result.error);
        return;
      }
      toast(
        productId
          ? willGoOffline
            ? "Saved — it's now in review and hidden from the mall until approved."
            : "Saved — it'll be re-reviewed before going live."
          : "Product created — now add photos.",
      );
      if (productId === null && result.id) {
        router.push(`/vendor/products/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }, (invalid) => setServerError(`Please check the form — ${firstFieldError(invalid) ?? "a field is not valid"}`));

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typeLevels.map((level, depth) => (
            <div key={depth}>
              <Label htmlFor={`productType-${depth}`}>{level.label}</Label>
              <Select id={`productType-${depth}`} value={level.value} onChange={(e) => chooseTypeAt(depth, e.target.value)}>
                <option value="">{depth === 0 ? "What kind of thing is this?" : `General ${chain[depth - 1]?.name ?? ""}`}</option>
                {level.options.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
              {depth === 0 ? <p className="mt-1 text-xs text-brand-dark/50">Separate from the category above — e.g. Jewellery, Candles, Flowers &amp; Plants.</p> : null}
            </div>
          ))}
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

      {effectiveAttributes.length > 0 ? (
        <Section title="Type-specific details">
          <p className="-mt-2 text-xs text-brand-dark/50">Optional, but every answer helps shoppers find this product with the filters on its category page.</p>
          <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          {effectiveAttributes.map((attr) => (
            <div key={attr.id} className={attr.input_type === "multi_select" ? "sm:col-span-2" : undefined}>
              <Label htmlFor={`attr-${attr.id}`}>{attr.label}</Label>
              {attr.input_type === "multi_select" ? (
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {attr.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-brand-dark/80">
                      <input type="checkbox" value={opt} className="h-4 w-4" {...register(`attributeValues.${attr.id}`)} />
                      {opt}
                    </label>
                  ))}
                </div>
              ) : (
                <Select
                  id={`attr-${attr.id}`}
                  value={firstAnswer(attributeValues[attr.id])}
                  onChange={(e) => setValue(`attributeValues.${attr.id}`, e.target.value ? [e.target.value] : [], { shouldDirty: true })}
                >
                  <option value="">Choose {attr.label.toLowerCase()}</option>
                  {attr.options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </Select>
              )}
            </div>
          ))}
          </div>
        </Section>
      ) : null}

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

      {willGoOffline ? (
        <div className="flex items-start gap-3 rounded-xl border border-brand-secondary/25 bg-brand-accent/60 p-3 text-sm text-brand-dark">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary-dark" aria-hidden="true" />
          <p>
            <span className="font-medium">Saving will take this product offline.</span> It goes back into review and returns to the mall only after our team approves it.
            Wishlisted customers will see it as temporarily unavailable until then.
          </p>
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={isPending}>
        {isPending ? "Saving…" : productId ? (willGoOffline ? "Save & send for review" : "Save changes") : "Create product"}
      </Button>
    </form>
  );
}

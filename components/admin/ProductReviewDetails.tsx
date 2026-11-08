import { Image as ImageIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ProductImage } from "@/components/shop/ProductImage";
import {
  describeEngraving,
  diffProductSnapshots,
  summariseProductReview,
  type ProductDiff,
  type ProductFieldChange,
  type ProductImageChange,
  type ProductReviewAuditRow,
  type ProductSnapshot,
  type ProductVariantChange,
  type ProductVariantSnapshot,
} from "@/lib/catalog/product-review";
import { formatCurrency } from "@/lib/utils/format";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * The reviewer's "what am I actually approving?" panel. It compares the current pending product with
 * the state before the first vendor edit since the last approval, so multiple saves cannot hide an
 * earlier change. New products (and older submissions with no snapshot) get the full current listing.
 */
export function ProductReviewDetails({
  history,
  current,
  everApproved,
}: {
  history: ProductReviewAuditRow[];
  current: ProductSnapshot | null;
  everApproved: boolean;
}) {
  const summary = summariseProductReview(history);
  const after = current ?? summary?.after ?? null;

  if (!after) {
    return (
      <p className="mt-3 rounded-xl border border-dashed border-brand-dark/15 bg-brand-light/50 p-3 text-xs text-brand-dark/55">
        No change details were captured for this submission.
      </p>
    );
  }

  if (!everApproved) {
    return (
      <section className="mt-4 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-dark/45">New product submission</h3>
          <p className="text-xs text-brand-dark/50">
            {summary ? `${plural(summary.editCount, "save")} · latest ${formatDate(summary.latestChangedAt)}` : "First submission"}
          </p>
        </div>
        <p className="mt-1 text-xs text-brand-dark/55">There is no previously approved version to compare against.</p>
        <SnapshotDetails snapshot={after} />
      </section>
    );
  }

  if (!summary?.before) {
    return (
      <section className="mt-4 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-dark/45">Current listing</h3>
          <p className="text-xs text-brand-dark/50">No before/after snapshot was captured for this edit — showing the current listing</p>
        </div>
        <SnapshotDetails snapshot={after} />
      </section>
    );
  }

  const diff = diffProductSnapshots(summary.before, after);
  return (
    <section className="mt-4 rounded-xl border border-brand-dark/10 bg-brand-light/50 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-brand-dark/45">Changes since the last approval</h3>
        <p className="text-xs text-brand-dark/50">
          {plural(summary.editCount, "save")} · latest {formatDate(summary.latestChangedAt)}
        </p>
      </div>
      {diff.hasChanges ? (
        <DiffView diff={diff} />
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-brand-dark/15 p-3 text-sm text-brand-dark/60">
          No content changes — the vendor resubmitted this listing for review.
        </p>
      )}
    </section>
  );
}

function DiffView({ diff }: { diff: ProductDiff }) {
  return (
    <div className="mt-3 space-y-5">
      {diff.fields.length > 0 ? (
        <DiffGroup title="Details">
          <div className="space-y-3">
            {diff.fields.map((field) => (
              <FieldDiff key={field.key} field={field} />
            ))}
          </div>
        </DiffGroup>
      ) : null}

      {diff.variants.length > 0 ? (
        <DiffGroup title={`Variants (${diff.variants.length})`}>
          <ul className="space-y-2">
            {diff.variants.map((variant) => (
              <VariantDiff key={variant.id} change={variant} />
            ))}
          </ul>
        </DiffGroup>
      ) : null}

      {diff.attributes.length > 0 ? (
        <DiffGroup title="Specifications">
          <ul className="space-y-2">
            {diff.attributes.map((attribute) => (
              <li key={attribute.id} className="grid gap-1 text-sm sm:grid-cols-[150px_1fr] sm:gap-3">
                <span className="text-xs font-medium text-brand-dark/50">{attribute.label}</span>
                <p className="break-words text-brand-dark/80">
                  <span className="text-brand-dark/40 line-through">{attribute.before}</span>
                  <span className="mx-2 text-brand-dark/30">→</span>
                  <span className="font-medium text-brand-dark">{attribute.after}</span>
                </p>
              </li>
            ))}
          </ul>
        </DiffGroup>
      ) : null}

      {diff.images.length > 0 ? (
        <DiffGroup title="Photos">
          <ul className="flex flex-wrap gap-3">
            {diff.images.map((image) => (
              <ImageDiff key={`${image.kind}-${image.id}`} change={image} />
            ))}
          </ul>
        </DiffGroup>
      ) : null}
    </div>
  );
}

function DiffGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark/40">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function FieldDiff({ field }: { field: ProductFieldChange }) {
  if (field.multiline) {
    return (
      <div>
        <p className="text-xs font-medium text-brand-dark/55">{field.label}</p>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-red-700/60">Before</p>
            <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-red-200/70 bg-red-50 p-2 text-xs text-red-800">
              {field.before}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-primary/70">After</p>
            <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-primary/20 bg-brand-primary/10 p-2 text-xs text-brand-dark">
              {field.after}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-1 text-sm sm:grid-cols-[150px_1fr] sm:gap-3">
      <span className="text-xs font-medium text-brand-dark/50">{field.label}</span>
      <p className="break-words text-brand-dark/80">
        <span className="text-brand-dark/40 line-through">{field.before}</span>
        <span className="mx-2 text-brand-dark/30">→</span>
        <span className="font-medium text-brand-dark">{field.after}</span>
      </p>
    </div>
  );
}

function VariantDiff({ change }: { change: ProductVariantChange }) {
  const badge =
    change.kind === "added"
      ? "bg-brand-primary/10 text-brand-primary"
      : change.kind === "removed"
        ? "bg-red-50 text-red-700"
        : "bg-brand-secondary/15 text-brand-secondary-dark";
  const label = change.kind === "added" ? "Added" : change.kind === "removed" ? "Removed" : "Changed";

  return (
    <li className="rounded-lg border border-brand-dark/10 bg-brand-surface/70 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-brand-dark">{change.label}</p>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badge}`}>{label}</span>
      </div>
      {change.kind === "changed" ? (
        <div className="mt-2 space-y-2">
          {change.fields.map((field) => (
            <FieldDiff key={field.key} field={field} />
          ))}
        </div>
      ) : (
        <VariantSummary variant={(change.after ?? change.before)!} />
      )}
    </li>
  );
}

function VariantSummary({ variant }: { variant: ProductVariantSnapshot }) {
  return (
    <p className="mt-1 text-xs text-brand-dark/55">
      {formatCurrency(variant.priceAdjustment)} price adjustment · {plural(variant.stockQuantity, "unit")} in stock
    </p>
  );
}

function ImageDiff({ change }: { change: ProductImageChange }) {
  const canShowImage = change.kind !== "removed" && change.image !== null;
  return (
    <li className="w-24">
      {canShowImage && change.image ? (
        <ProductImage
          src={change.image.thumbUrl ?? change.image.url}
          alt={change.image.altText ?? "Product photo"}
          className="aspect-square w-24 rounded-lg border border-brand-dark/10"
          sizes="96px"
        />
      ) : (
        <div className="flex aspect-square w-24 items-center justify-center rounded-lg border border-dashed border-brand-dark/15 bg-brand-light text-brand-dark/25">
          <ImageIcon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <span className="mt-1 block text-[10px] font-medium text-brand-dark/50">{change.label}</span>
    </li>
  );
}

function SnapshotDetails({ snapshot }: { snapshot: ProductSnapshot }) {
  const rows: Array<[string, string]> = [
    ["Category", snapshot.categoryName || "—"],
    ["Product type", snapshot.productTypeName || "—"],
    ["Regular price", formatCurrency(snapshot.basePrice)],
    ["Sale price", snapshot.salePrice === null ? "No sale price" : formatCurrency(snapshot.salePrice)],
    ["Stock", String(snapshot.stockQuantity)],
    ["SKU", snapshot.sku || "—"],
    ["Weight", snapshot.weightGrams === null ? "—" : `${snapshot.weightGrams} g`],
    ["GST", `${snapshot.gstRate}%`],
    ["HSN code", snapshot.hsnCode || "—"],
    ["Search tags", snapshot.tags.join(", ") || "None"],
    ["Occasions", snapshot.occasionTags.join(", ") || "None"],
    ["Recipients", snapshot.recipientTags.join(", ") || "None"],
    ["Personalisation", describeEngraving(snapshot.engraving)],
  ];

  return (
    <div className="mt-3 space-y-4">
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="text-brand-dark/50">{label}</dt>
            <dd className="break-words text-brand-dark/80">{value}</dd>
          </div>
        ))}
      </dl>

      <SnapshotText label="Short description" value={snapshot.shortDescription} />
      <SnapshotText label="Description" value={snapshot.description} />

      <SnapshotGroup title={`Variants (${snapshot.variants.length})`}>
        {snapshot.variants.length === 0 ? (
          <p className="text-xs text-brand-dark/50">No variants.</p>
        ) : (
          <ul className="space-y-1.5">
            {snapshot.variants.map((variant) => (
              <li key={variant.id} className="rounded-lg border border-brand-dark/10 bg-brand-surface/70 px-3 py-2">
                <p className="text-sm font-medium text-brand-dark">
                  {variant.name}: {variant.value}
                </p>
                <p className="text-xs text-brand-dark/55">
                  {formatCurrency(variant.priceAdjustment)} price adjustment · {plural(variant.stockQuantity, "unit")} in stock
                </p>
              </li>
            ))}
          </ul>
        )}
      </SnapshotGroup>

      <SnapshotGroup title="Specifications">
        {snapshot.attributes.length === 0 ? (
          <p className="text-xs text-brand-dark/50">No specifications.</p>
        ) : (
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {snapshot.attributes.map((attribute) => (
              <div key={attribute.id} className="grid grid-cols-[110px_1fr] gap-2">
                <dt className="text-brand-dark/50">{attribute.label}</dt>
                <dd className="break-words text-brand-dark/80">{attribute.values.join(", ")}</dd>
              </div>
            ))}
          </dl>
        )}
      </SnapshotGroup>

      <SnapshotGroup title={`Photos (${snapshot.images.length})`}>
        {snapshot.images.length === 0 ? (
          <p className="text-xs text-brand-dark/50">No photos.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {snapshot.images.map((image) => (
              <li key={image.id} className="relative w-24">
                <ProductImage
                  src={image.thumbUrl ?? image.url}
                  alt={image.altText ?? "Product photo"}
                  className="aspect-square w-24 rounded-lg border border-brand-dark/10"
                  sizes="96px"
                />
                {image.isPrimary ? (
                  <span className="absolute left-1 top-1 rounded-full bg-brand-secondary px-1.5 py-0.5 text-[9px] font-semibold text-brand-dark">
                    Main
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </SnapshotGroup>
    </div>
  );
}

function SnapshotText({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">{label}</p>
      <p className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-brand-dark/10 bg-brand-surface/70 p-2 text-sm text-brand-dark/75">
        {value || "—"}
      </p>
    </div>
  );
}

function SnapshotGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/40">{title}</p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

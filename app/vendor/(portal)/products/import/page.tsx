import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ProductImportForm } from "@/components/vendor/ProductImportForm";
import { createClient } from "@/lib/db/server";
import { requireApprovedVendor } from "@/lib/db/vendor-portal";
import { MAX_IMPORT_ROWS } from "@/lib/vendor/product-csv";
import { importCategories } from "@/lib/vendor/product-import";
import { OCCASION_TAGS, RECIPIENT_TAGS } from "@/lib/catalog/tags";

export const metadata = { title: "Import products — GiftPing Vendor" };

const COLUMNS: [string, string, string][] = [
  ["name", "Required", "The product name (at least 3 characters)."],
  ["category", "Required", "One of the categories listed below."],
  ["price", "Required", "Regular price in ₹, e.g. 1299 or 1299.50."],
  ["stock", "Required", "Whole units in stock (0 is fine)."],
  ["sale_price", "Optional", "Offer price — must be lower than the regular price."],
  ["sku", "Optional", "Your own code. Must be unique."],
  ["short_description / description", "Optional", "Shown on the product page."],
  ["weight_grams", "Optional", "Used for courier bookings."],
  ["gst_rate / hsn_code", "Optional", "GST % (default 18) and HSN code."],
  ["tags", "Optional", "Search keywords separated by ; — e.g. candles;handmade"],
  ["occasions / recipients", "Optional", "Separated by ; — see the lists below."],
  ["variants", "Optional", "Options like sizes or scents: type:value:extra price:stock, separated by |  — e.g. Size:Large:200:5|Size:Small"],
];

export default async function ImportProductsPage() {
  const { vendor } = await requireApprovedVendor();
  const [categories, { data: history }] = await Promise.all([
    importCategories(),
    (await createClient()).from("product_imports").select("id, product_count, created_at").eq("vendor_id", vendor.id).order("created_at", { ascending: false }).limit(10),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/vendor/products" className="inline-flex items-center gap-1 text-sm text-brand-dark/60 hover:underline"><ArrowLeft className="h-4 w-4" /> Products</Link>
        <h1 className="mt-2 font-heading text-3xl text-brand-dark">Import products from a spreadsheet</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-dark/60">
          Add many products at once. Fill in the template (Excel or Google Sheets), save it as CSV and upload it here — we check every row first and only import when everything is fine.
          Up to {MAX_IMPORT_ROWS} products per file. Photos are added afterwards, one product at a time.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-brand-dark">1. Get the template</h2>
        <a href="/api/vendor/product-template" className="inline-flex items-center gap-2 rounded-full border border-brand-dark/15 bg-brand-surface px-4 py-2 text-sm text-brand-dark hover:bg-brand-accent">
          <Download className="h-4 w-4" /> Download the CSV template
        </a>
        <details className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4 text-sm">
          <summary className="cursor-pointer font-medium text-brand-dark">What goes in each column?</summary>
          <dl className="mt-3 space-y-2">
            {COLUMNS.map(([name, kind, help]) => (
              <div key={name} className="grid gap-x-3 sm:grid-cols-[13rem_5rem_1fr]">
                <dt className="font-mono text-xs text-brand-dark">{name}</dt>
                <dd className="text-xs text-brand-dark/50">{kind}</dd>
                <dd className="text-brand-dark/70">{help}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-brand-dark/70"><strong>Categories:</strong> {categories.map((c) => c.name).join(", ")}</p>
          <p className="mt-1 text-brand-dark/70"><strong>Occasions:</strong> {OCCASION_TAGS.join(", ")}</p>
          <p className="mt-1 text-brand-dark/70"><strong>Recipients:</strong> {RECIPIENT_TAGS.join(", ")}</p>
        </details>
      </section>

      <section className="space-y-3">
        <h2 className="font-heading text-xl text-brand-dark">2. Upload your file</h2>
        <ProductImportForm />
      </section>

      {(history ?? []).length > 0 ? (
        <section>
          <h2 className="font-heading text-xl text-brand-dark">Earlier imports</h2>
          <ul className="mt-3 divide-y divide-brand-dark/10 overflow-hidden rounded-2xl border border-brand-dark/10 bg-brand-surface text-sm">
            {(history ?? []).map((h) => (
              <li key={h.id} className="flex justify-between gap-3 p-3"><span>{h.product_count} {h.product_count === 1 ? "product" : "products"}</span><span className="text-brand-dark/60">{new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

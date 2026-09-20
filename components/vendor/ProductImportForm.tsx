"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/format";
import { commitProductImportAction, previewProductImportAction } from "@/lib/vendor/import-actions";
import type { ImportPreview } from "@/lib/vendor/product-import";

const MAX_BYTES = 500_000;

/**
 * Step 1: choose the file — it is checked straight away (nothing is saved). Step 2: import, once the check is clean. The server re-reads and re-validates the
 * text at import time, so this screen only ever shows what the server itself found.
 */
export function ProductImportForm() {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [checking, startChecking] = useTransition();
  const [importing, startImporting] = useTransition();

  function reset() {
    setFileName(null); setCsv(null); setPreview(null); setError(null); setDone(null);
    if (input.current) input.current.value = "";
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setPreview(null); setError(null); setDone(null);
    setFileName(file.name);
    if (file.size > MAX_BYTES) return setError("That file is too large. Split it into files of up to 200 products.");
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== "text/csv") return setError("Please upload a .csv file (in Excel or Google Sheets: File → Save/Download as CSV).");
    const text = await file.text();
    setCsv(text);
    startChecking(async () => {
      const result = await previewProductImportAction(text);
      if (result.error || !result.preview) return setError(result.error ?? "Couldn't check the file.");
      setPreview(result.preview);
    });
  }

  function runImport() {
    if (!csv) return;
    setError(null);
    startImporting(async () => {
      const result = await commitProductImportAction(csv);
      if (!result.ok) return setError(result.error);
      setDone(result.count);
      setCsv(null); setPreview(null);
    });
  }

  if (done !== null) {
    return (
      <div role="status" className="space-y-3 rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-5 text-sm text-brand-dark">
        <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-brand-primary" /> {done} {done === 1 ? "product was" : "products were"} added as drafts.</p>
        <p className="text-brand-dark/70">They&apos;re hidden from shoppers for now. Open each one, add its photos, then choose <strong>Resubmit</strong> to send it for review — it goes live once approved.</p>
        <div className="flex gap-3">
          <Button asChild size="sm"><Link href="/vendor/products">Go to my products</Link></Button>
          <Button size="sm" variant="ghost" onClick={reset}>Import another file</Button>
        </div>
      </div>
    );
  }

  const busy = checking || importing;
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-dark/25 bg-brand-accent/40 px-4 py-8 text-sm text-brand-dark/70 hover:bg-brand-accent disabled:opacity-60"
      >
        <FileSpreadsheet className="h-6 w-6" />
        {fileName ? <span>{fileName} — click to choose a different file</span> : <span>Choose your CSV file</span>}
      </button>
      <input ref={input} type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />

      {checking ? <p role="status" className="text-sm text-brand-dark/60">Checking your file…</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p> : null}

      {preview ? (
        <div className="space-y-4">
          {preview.alreadyImported ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">You&apos;ve already imported this exact file. Change it (or add new rows) to import again.</p>
          ) : null}

          {preview.errorTotal > 0 ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm" aria-label="Problems to fix">
              <h2 className="flex items-center gap-2 font-medium text-red-900"><AlertTriangle className="h-4 w-4" /> {preview.errorTotal} {preview.errorTotal === 1 ? "problem" : "problems"} to fix — nothing has been imported</h2>
              <p className="mt-1 text-red-800/80">Fix these in your spreadsheet, save it as CSV again and choose the file again. Row numbers match the ones in your spreadsheet.</p>
              <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <li key={i} className="text-red-900"><strong>{e.row ? `Row ${e.row}` : "File"}</strong>{e.column ? ` · ${e.column}` : ""}: {e.message}</li>
                ))}
                {preview.errorTotal > preview.errors.length ? <li className="text-red-800/70">…and {preview.errorTotal - preview.errors.length} more. Fix these first and check again.</li> : null}
              </ul>
            </section>
          ) : null}

          {preview.warningTotal > 0 ? (
            <section className="rounded-2xl border border-brand-secondary/40 bg-brand-accent/60 p-4 text-sm" aria-label="Things to double-check">
              <h2 className="font-medium text-brand-dark">Worth a look ({preview.warningTotal})</h2>
              <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-brand-dark/80">
                {preview.warnings.map((w, i) => <li key={i}>{w.row ? `Row ${w.row}: ` : ""}{w.message}</li>)}
              </ul>
            </section>
          ) : null}

          {preview.errorTotal === 0 && preview.validCount > 0 ? (
            <section className="rounded-2xl border border-brand-primary/30 bg-brand-primary/5 p-4 text-sm" aria-label="Ready to import">
              <h2 className="flex items-center gap-2 font-medium text-brand-dark"><CheckCircle2 className="h-4 w-4 text-brand-primary" /> {preview.validCount} {preview.validCount === 1 ? "product is" : "products are"} ready to import</h2>
              <ul className="mt-3 divide-y divide-brand-dark/10 rounded-xl bg-white">
                {preview.sample.map((p) => (
                  <li key={p.row} className="flex flex-wrap justify-between gap-2 p-2.5">
                    <span className="font-medium text-brand-dark">{p.name} <span className="font-normal text-brand-dark/50">· {p.category}</span></span>
                    <span className="text-brand-dark/70">{p.salePrice !== null ? `${formatCurrency(p.salePrice)} (was ${formatCurrency(p.price)})` : formatCurrency(p.price)} · {p.stock} in stock{p.variants ? ` · ${p.variants} options` : ""}</span>
                  </li>
                ))}
                {preview.validCount > preview.sample.length ? <li className="p-2.5 text-brand-dark/50">…and {preview.validCount - preview.sample.length} more</li> : null}
              </ul>
              <p className="mt-3 text-xs text-brand-dark/60">They&apos;ll be added as hidden drafts. You&apos;ll add photos and send each one for review afterwards.</p>
              <Button className="mt-3" onClick={runImport} disabled={busy || !preview.ok}>{importing ? "Importing…" : `Import ${preview.validCount} ${preview.validCount === 1 ? "product" : "products"}`}</Button>
            </section>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

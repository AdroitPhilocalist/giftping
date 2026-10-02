"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { saveSeoPageAction } from "@/lib/admin/seo-actions";
import { SEO_LIMITS, lengthState, truncateText, type SeoLengthState } from "@/lib/seo/pages";
import { seoSchema } from "@/lib/validation/seo.schema";

export interface SeoPageFormProps {
  pageKey: string;
  label: string;
  path: string;
  /** the built-in text used when a field is left blank */
  defaultTitle: string;
  defaultDescription: string;
  initial: { title: string; description: string; noindex: boolean };
  /** the site address, for the preview's URL line */
  siteHost: string;
}

const STATE_TEXT: Record<SeoLengthState, string> = {
  empty: "Using the default",
  good: "Good length",
  long: "May be cut off in search results",
  "too-long": "Too long",
};
const STATE_CLASS: Record<SeoLengthState, string> = {
  empty: "text-brand-dark/45",
  good: "text-brand-primary",
  long: "text-brand-secondary-dark",
  "too-long": "text-red-700",
};

function Counter({ length, ideal, max }: { length: number; ideal: number; max: number }) {
  const state = lengthState(length, ideal, max);
  return <p className={`mt-1 text-xs ${STATE_CLASS[state]}`}>{length} / {ideal} · {STATE_TEXT[state]}</p>;
}

export function SeoPageForm({ pageKey, label, path, defaultTitle, defaultDescription, initial, siteHost }: SeoPageFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [noindex, setNoindex] = useState(initial.noindex);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shownTitle = title.trim() || defaultTitle;
  const shownDescription = description.trim() || defaultDescription;
  const dirty = title !== initial.title || description !== initial.description || noindex !== initial.noindex;

  function save(next?: { title: string; description: string; noindex: boolean }) {
    const values = next ?? { title, description, noindex };
    setError(null);
    const parsed = seoSchema.safeParse({ metaTitle: values.title, metaDescription: values.description, noindex: values.noindex });
    if (!parsed.success) return setError(parsed.error.issues[0]?.message ?? "Check the details.");
    startTransition(async () => {
      const result = await saveSeoPageAction(pageKey, { metaTitle: values.title, metaDescription: values.description, noindex: values.noindex });
      if (result.error) return setError(result.error);
      toast.success(`${label} saved.`);
      router.refresh();
    });
  }

  return (
    <section aria-labelledby={`seo-${pageKey}`} className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`seo-${pageKey}`} className="font-heading text-lg text-brand-dark">{label}</h2>
        <a href={path} target="_blank" rel="noreferrer" className="text-xs text-brand-dark/50 underline">{path === "/" ? "/ (home)" : path} ↗</a>
      </div>

      <div className="mt-3 grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <Label htmlFor={`${pageKey}-title`}>Page title</Label>
            <Input id={`${pageKey}-title`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={defaultTitle} maxLength={SEO_LIMITS.titleMax + 20} />
            <Counter length={title.trim().length} ideal={SEO_LIMITS.titleIdeal} max={SEO_LIMITS.titleMax} />
          </div>
          <div>
            <Label htmlFor={`${pageKey}-desc`}>Description</Label>
            <Textarea id={`${pageKey}-desc`} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={defaultDescription} maxLength={SEO_LIMITS.descriptionMax + 40} />
            <Counter length={description.trim().length} ideal={SEO_LIMITS.descriptionIdeal} max={SEO_LIMITS.descriptionMax} />
          </div>
          <label className="flex items-start gap-2 text-sm text-brand-dark">
            <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} className="mt-1 h-4 w-4 accent-brand-primary" />
            <span>Hide this page from search engines<span className="block text-xs text-brand-dark/50">Also removes it from the sitemap. The page still works for anyone with the link.</span></span>
          </label>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-brand-dark/50">How it may look on Google</p>
          <div className="mt-2 rounded-xl border border-brand-dark/10 bg-brand-light p-3">
            <p className="truncate text-xs text-brand-dark/60">{siteHost}{path === "/" ? "" : path}</p>
            <p className="mt-0.5 text-[17px] leading-snug text-brand-primary">{truncateText(shownTitle, SEO_LIMITS.titleIdeal)}</p>
            <p className="mt-0.5 text-sm text-brand-dark/70">{truncateText(shownDescription, SEO_LIMITS.descriptionIdeal)}</p>
            {noindex ? <p className="mt-2 rounded-md bg-brand-accent/70 px-2 py-1 text-xs text-brand-dark">Hidden from search engines</p> : null}
          </div>
          <p className="mt-2 text-xs text-brand-dark/50">Search engines decide the final wording; this is a good guide. Leave a box empty to use the default shown inside it.</p>
        </div>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" disabled={pending || !dirty} onClick={() => save()}>{pending ? "Saving…" : "Save"}</Button>
        <Button size="sm" variant="ghost" disabled={pending || (!initial.title && !initial.description && !initial.noindex)} onClick={() => { setTitle(""); setDescription(""); setNoindex(false); save({ title: "", description: "", noindex: false }); }}>Reset to default</Button>
      </div>
    </section>
  );
}

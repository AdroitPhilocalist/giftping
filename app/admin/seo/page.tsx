import Link from "next/link";
import { SeoPageForm } from "@/components/admin/SeoPageForm";
import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { SEO_PAGES } from "@/lib/seo/pages";
import { siteUrl } from "@/lib/seo/site";

export const metadata = { title: "SEO — GiftPing Admin" };

const isBlank = (v: string | null) => !v || v.trim() === "";

export default async function AdminSeoPage() {
  await requireRole("admin");
  // The admin's own session: RLS (is_admin) lets them read site_seo and the hidden categories the public can't see.
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }, { count: activeProducts }, { count: noDescription }] = await Promise.all([
    supabase.from("site_seo").select("page_key, meta_title, meta_description, noindex"),
    supabase.from("categories").select("name, slug, meta_title, meta_description, description, is_active").eq("is_active", true).order("sort_order"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active").or("meta_description.is.null,meta_description.eq.").or("short_description.is.null,short_description.eq."),
  ]);
  const byKey = new Map((rows ?? []).map((r) => [r.page_key, r]));
  const host = siteUrl();
  const cats = categories ?? [];
  const catsNoSeoText = cats.filter((c) => isBlank(c.meta_title) && isBlank(c.meta_description));
  const catsNoAnyDescription = cats.filter((c) => isBlank(c.meta_description) && isBlank(c.description));

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="font-heading text-3xl text-brand-dark">SEO</h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-dark/60">
          What search engines and shared links show for GiftPing&apos;s pages. Leave anything blank to use the built-in wording.{" "}
          <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="underline">sitemap.xml ↗</a> · <a href="/robots.txt" target="_blank" rel="noreferrer" className="underline">robots.txt ↗</a>
        </p>
      </div>

      <section aria-labelledby="fixed-heading" className="space-y-4">
        <h2 id="fixed-heading" className="font-heading text-xl text-brand-dark">Main pages</h2>
        {SEO_PAGES.map((p) => {
          const row = byKey.get(p.key);
          return (
            <SeoPageForm
              key={`${p.key}:${row?.meta_title ?? ""}:${row?.meta_description ?? ""}:${row?.noindex ?? false}`}
              pageKey={p.key}
              label={p.label}
              path={p.path}
              defaultTitle={p.title}
              defaultDescription={p.description}
              initial={{ title: row?.meta_title ?? "", description: row?.meta_description ?? "", noindex: row?.noindex ?? false }}
              siteHost={host.replace(/^https?:\/\//, "")}
            />
          );
        })}
      </section>

      <section aria-labelledby="health-heading" className="space-y-3">
        <h2 id="health-heading" className="font-heading text-xl text-brand-dark">Where text is missing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
            <h3 className="font-medium text-brand-dark">Occasion (category) pages</h3>
            <p className="mt-1 text-sm text-brand-dark/70">
              {catsNoSeoText.length === 0 ? "Every occasion page has its own search title or description." : `${catsNoSeoText.length} of ${cats.length} have no custom search text — they use their name and short description.`}
            </p>
            {catsNoAnyDescription.length > 0 ? <p className="mt-1 text-sm text-red-700">{catsNoAnyDescription.length} have no description at all: {catsNoAnyDescription.map((c) => c.name).join(", ")}.</p> : null}
            <p className="mt-2 text-xs text-brand-dark/50">Set the search title and description for each occasion in <Link href="/admin/categories" className="underline">Categories</Link> (Edit → Meta title and Meta description).</p>
          </div>
          <div className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
            <h3 className="font-medium text-brand-dark">Product pages</h3>
            <p className="mt-1 text-sm text-brand-dark/70">
              {(noDescription ?? 0) === 0
                ? `All ${activeProducts ?? 0} live products have a description search engines can use.`
                : `${noDescription} of ${activeProducts ?? 0} live products have no description at all, so search results show nothing under them.`}
            </p>
            <p className="mt-2 text-xs text-brand-dark/50">Products use the boutique&apos;s own short description (or the name). Boutiques write these in their product form.</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="auto-heading" className="rounded-2xl border border-brand-dark/10 bg-brand-surface p-4">
        <h2 id="auto-heading" className="font-heading text-lg text-brand-dark">Handled automatically</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-brand-dark/70">
          <li>A <strong>sitemap</strong> listing every live page, product, boutique and occasion, updated as the catalogue changes. Hidden products and suspended boutiques are never listed.</li>
          <li><strong>robots.txt</strong> keeps search engines out of the admin, vendor portal, cart, checkout, accounts and the private diary.</li>
          <li>Each page names its <strong>canonical address</strong>, and filtered or sorted occasion pages are hidden from search engines so they don&apos;t compete with the main one.</li>
          <li>Shared links show the page&apos;s title, description and picture (a product&apos;s own photo, or the mall picture).</li>
          <li>Test and preview deployments tell search engines to ignore them entirely.</li>
        </ul>
      </section>
    </div>
  );
}

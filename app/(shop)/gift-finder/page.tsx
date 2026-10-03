import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { GiftFinderQuiz } from "@/components/shop/GiftFinderQuiz";
import { ProductCard } from "@/components/shop/ProductCard";
import { ProductGrid } from "@/components/shop/ProductGrid";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { getProductCardsByIds } from "@/lib/db/products";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { loadCandidatePool } from "@/lib/diary/candidates";
import { labelOf, parseQuiz, quizQuery, rankQuiz, type QuizAnswers } from "@/lib/gift-finder/quiz";
import { pageMetadata } from "@/lib/seo/site-seo";

// The bare page is a normal, indexable landing page. A page of RESULTS is one of thousands of possible answer combinations — personal, thin and
// duplicate-prone — so it is kept out of search results (like filtered category pages).
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }): Promise<Metadata> {
  const base = await pageMetadata("gift-finder");
  return Object.keys(await searchParams).length > 0 ? { ...base, robots: { index: false, follow: true } } : base;
}

const summaryOf = (a: QuizAnswers) => [`For ${labelOf.who(a.who).toLowerCase()}`, labelOf.occasion(a.occasion).toLowerCase(), labelOf.budget(a.budget).toLowerCase(), ...a.likes.map((l) => labelOf.interest(l).toLowerCase())];

export default async function GiftFinderPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { answers, partial } = parseQuiz(await searchParams);

  let results: { card: Awaited<ReturnType<typeof getProductCardsByIds>>[number]; reasons: string[] }[] | null = null;
  if (answers) {
    const supabase = await createClient(); // the visitor's own session, so RLS decides what is visible (live products, approved boutiques)
    const pool = await loadCandidatePool(supabase);
    const ranked = rankQuiz({ answers, candidates: pool.candidates });
    const cards = await getProductCardsByIds(ranked.map((r) => r.productId));
    const byId = new Map(cards.map((c) => [c.id, c]));
    results = ranked.flatMap((r) => (byId.has(r.productId) ? [{ card: byId.get(r.productId)!, reasons: r.reasons }] : []));
  }
  const user = results ? await getServerUser() : null;
  const wishlistIds = user ? await getWishlistProductIds(user.id) : new Set<string>();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mx-auto max-w-3xl text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Gift finder</p>
        <h1 className="mt-2 font-heading text-4xl text-brand-dark sm:text-5xl">{answers ? <>Gifts they&apos;ll <span className="accent-word">love</span></> : <>Find the perfect gift in <span className="accent-word">four</span> questions</>}</h1>
        {!answers ? <p className="mt-3 text-brand-dark/65">Tell us a little about who you&apos;re shopping for and we&apos;ll pick from every boutique in the mall.</p> : null}
      </header>

      <div className="mx-auto mt-8 max-w-3xl">
        <GiftFinderQuiz initial={partial} summary={answers ? summaryOf(answers) : []} defaultOpen={!answers} />
      </div>

      {answers && results ? (
        <section aria-labelledby="results-heading" className="mt-10">
          {results.length === 0 ? (
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-card border border-brand-dark/10 bg-brand-surface p-10 text-center shadow-card">
              <Robin pose="sleeping" className="w-28" title="" />
              <h2 id="results-heading" className="font-heading text-2xl text-brand-dark">Nothing fits just yet</h2>
              <p className="text-sm text-brand-dark/65">We couldn&apos;t find a match inside that budget. A little more room usually helps — or browse everything for that occasion.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild><Link href={`/gift-finder?${quizQuery({ ...answers, budget: "any" })}`}>Show gifts at any price</Link></Button>
                <Button variant="secondary" asChild><Link href="/categories">Browse occasions</Link></Button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="results-heading" className="font-heading text-2xl text-brand-dark">{results.length} {results.length === 1 ? "idea" : "ideas"} for {labelOf.who(answers.who).toLowerCase()}</h2>
                <p className="text-sm text-brand-dark/55">Best matches first</p>
              </div>
              <ProductGrid className="mt-5">
                {results.map(({ card, reasons }, i) => (
                  <div key={card.id} className="flex flex-col gap-2">
                    {i === 0 ? <Badge variant="gold" className="w-fit"><Sparkles className="mr-1 h-3 w-3" aria-hidden="true" />Best match</Badge> : null}
                    <ProductCard product={card} isWishlisted={wishlistIds.has(card.id)} />
                    <ul className="flex flex-wrap gap-1.5" aria-label={`Why ${card.name} was picked`}>
                      {reasons.slice(0, 3).map((reason) => <li key={reason} className="rounded-full bg-brand-accent/70 px-2.5 py-1 text-xs text-brand-dark/80">{reason}</li>)}
                    </ul>
                  </div>
                ))}
              </ProductGrid>
            </>
          )}
        </section>
      ) : null}
    </div>
  );
}

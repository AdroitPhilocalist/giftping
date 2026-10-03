import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { Reveal } from "@/components/motion/Reveal";
import { Jaali } from "@/components/ornaments/Jaali";
import { Button } from "@/components/ui/Button";

/** "Not sure what to give?" — the gift-finder invitation: four quick questions, a shelf of ideas picked from every boutique. */
export function GiftFinderBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-card border border-brand-secondary/20 bg-gradient-to-br from-brand-surface to-brand-accent/70 shadow-card">
          <Jaali className="opacity-[0.07]" />
          <div className="relative grid items-center gap-5 px-6 py-7 sm:px-10 md:grid-cols-[auto_1fr_auto]">
            <Robin pose="search" className="float-slow w-24 sm:w-28" title="The GiftPing robin, looking for a gift" />
            <div>
              <h2 className="font-heading text-2xl leading-tight text-brand-dark sm:text-3xl">Not sure what to <span className="accent-word">give</span>?</h2>
              <p className="mt-1.5 max-w-xl text-sm text-brand-dark/70 sm:text-base">Answer four quick questions — who it&apos;s for, the occasion, your budget and what they love — and we&apos;ll pick from every boutique in the mall.</p>
            </div>
            <Button size="lg" asChild>
              <Link href="/gift-finder"><Sparkles className="h-4 w-4" aria-hidden="true" /> Find the perfect gift</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

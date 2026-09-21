import Link from "next/link";
import { BellRing } from "lucide-react";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { Robin, hasRobinArt } from "@/components/art/Robin";
import { Reveal } from "@/components/motion/Reveal";
import { Jaali } from "@/components/ornaments/Jaali";
import { Button } from "@/components/ui/Button";

/** "Never miss an important moment" — the diary invitation, with the robin and a gift keeping company. */
export function DiaryBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <Reveal>
        <div className="relative overflow-hidden rounded-card border border-brand-secondary/20 bg-brand-accent">
          <Jaali className="opacity-[0.09]" />
          <div className="relative grid items-center gap-6 px-6 py-8 sm:px-10 md:grid-cols-[auto_1fr_auto] md:py-10">
            <div className="flex items-end gap-2 md:order-none">
              {hasRobinArt("on-gift") ? (
                <Robin pose="on-gift" className="float-slow w-32 sm:w-36" />
              ) : (
                <>
                  <Robin className="float-slow w-24 sm:w-28" />
                  <GiftBoxArt tone="green" className="-ml-4 w-20 sm:w-24" />
                </>
              )}
            </div>
            <div>
              <h2 className="font-heading text-3xl leading-tight text-brand-dark sm:text-4xl">Never miss an <span className="accent-word">important moment</span> again.</h2>
              <p className="mt-2 max-w-lg text-sm text-brand-dark/70 sm:text-base">Keep a diary of the people you love. We&apos;ll remind you before their special days — with gift ideas they&apos;ll adore.</p>
            </div>
            <Button size="lg" asChild>
              <Link href="/diary"><BellRing className="h-4 w-4" /> Open My Diary</Link>
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site-seo";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, HeartHandshake, Store } from "lucide-react";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { Robin } from "@/components/art/Robin";
import { DiaryBand } from "@/components/home/DiaryBand";
import { SectionHeading } from "@/components/home/SectionHeading";
import { Reveal } from "@/components/motion/Reveal";
import { siteImage } from "@/lib/content/imagery";
import { PageHero } from "@/components/pages/PageHero";
import { Button } from "@/components/ui/Button";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("about");

const PILLARS = [
  { icon: Store, title: "A mall, not a warehouse", text: "Walk through boutiques run by people who care about their craft, alongside our own GiftPing Originals. Every shop has its own personality." },
  { icon: BellRing, title: "A diary that remembers", text: "Save the people you love and the dates that matter. We remind you in good time — with gift ideas they will actually like." },
  { icon: HeartHandshake, title: "Made personal", text: "Add a name, a note, an occasion. A gift that says something feels different from one that just arrives." },
];

const STEPS = [
  { n: "1", key: "step-browse", title: "Wander in", text: "Browse the mall by occasion, by boutique, or by who you’re shopping for." },
  { n: "2", key: "step-personalise", title: "Make it yours", text: "Personalise it, add gift wrap, and check delivery to their pincode." },
  { n: "3", key: "step-deliver", title: "We follow it home", text: "Each boutique ships its own part, and you can watch every parcel on its way." },
];

export default function AboutPage() {
  return (
    <div>
      <PageHero eyebrow="About GiftPing" title={<>Gifts that feel <span className="accent-word">chosen.</span></>} subtitle="GiftPing is a gifting mall for India — independent boutiques, our own Originals, and a diary that helps you remember the moments that matter.">
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild><Link href="/mall">Explore the Mall <ArrowRight className="h-4 w-4" /></Link></Button>
          <Button size="lg" variant="outline" asChild><Link href="/vendor/register">Open a boutique</Link></Button>
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_auto]">
          <div className="max-w-2xl">
            <SectionHeading align="left" eyebrow="Our idea" title="Gifting should feel like walking through a beautiful place" />
            <div className="mt-5 space-y-4 leading-relaxed text-brand-dark/75">
              <p>Most gifting sites are long lists. We wanted something closer to an evening at a lovely mall: warm light, shops with character, and someone friendly to help you find the right thing.</p>
              <p>So GiftPing is organised like one. There are boutiques to visit, occasions to shop by, and a diary that quietly keeps track of birthdays and anniversaries so you never scramble at the last minute.</p>
            </div>
          </div>
          <div className="hidden items-end gap-2 lg:flex" aria-hidden="true">
            <Robin className="float-slow w-32" />
            <GiftBoxArt tone="green" className="-ml-5 w-36" />
          </div>
        </div>
      </section>

      <section className="border-y border-brand-dark/[0.06] bg-brand-accent/40">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-14 sm:px-6 md:grid-cols-3 lg:px-8">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <div className="h-full rounded-card border border-brand-dark/[0.06] bg-brand-surface p-7 shadow-card">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><p.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" /></span>
                <h3 className="mt-5 font-heading text-xl text-brand-dark">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-dark/70">{p.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <SectionHeading eyebrow="How it works" title="From first look to front door" />
        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="text-center">
              {(() => {
                const art = siteImage(s.key as "step-browse" | "step-personalise" | "step-deliver");
                return art ? <Image src={art.src} alt="" width={art.width} height={art.height} sizes="(min-width: 768px) 30vw, 90vw" className="mx-auto mb-5 aspect-[4/3] w-full max-w-xs rounded-card object-cover shadow-card" /> : null;
              })()}
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-secondary font-heading text-lg text-brand-on-secondary">{s.n}</span>
              <h3 className="mt-4 font-heading text-lg text-brand-dark">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-dark/70">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <DiaryBand />
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Ambience, ambienceFor } from "@/components/shop/Ambience";
import { GiftBoxArt } from "@/components/art/GiftBoxArt";
import { Robin } from "@/components/art/Robin";
import { Jaali } from "@/components/ornaments/Jaali";
import type { SiteImage } from "@/lib/content/imagery";
import { cn } from "@/lib/utils/cn";

/**
 * The header of an occasion's "world": the client's artwork slowly drifting (a gentle zoom), petals/confetti/hearts falling across it, the headline and a row of
 * the other worlds to hop to, and a scalloped edge into the page. Falls back to the drawn robin and gift boxes until the artwork exists.
 */
export function WorldHero({ slug, image, lead, tail, description, name, siblings }: { slug: string; image: SiteImage | null; lead: string; tail: string; description: string | null; name: string; siblings: { slug: string; name: string }[] }) {
  return (
    <section className="relative isolate overflow-hidden bg-brand-accent/70">
      {image ? (
        <div className="absolute inset-y-0 right-0 hidden w-[62%] [mask-image:linear-gradient(to_right,transparent_0%,black_45%)] md:block" aria-hidden="true">
          <Image src={image.src} alt="" fill priority sizes="60vw" className="world-photo object-cover" />
        </div>
      ) : (
        <Jaali className="opacity-[0.07]" />
      )}
      <Ambience kind={ambienceFor(slug)} />
      <div className="relative mx-auto grid max-w-7xl items-center gap-6 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1fr_auto] lg:px-8 lg:pb-24 lg:pt-20">
        <div className="rise max-w-xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/60">
            <Link href="/categories" className="hover:text-brand-secondary-dark">Occasions</Link> <span className="text-brand-secondary">›</span> {name}
          </p>
          <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl lg:text-6xl">
            {lead} <span className="accent-word">{tail}</span>
          </h1>
          {description ? <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-dark/70">{description}</p> : null}
          {siblings.length > 1 ? (
            <nav aria-label="Other worlds" className="rise mt-6 flex flex-wrap gap-2" style={{ ["--rise-delay" as string]: "150ms" }}>
              {siblings.map((s) => (
                <Link key={s.slug} href={`/categories/${s.slug}`} aria-current={s.slug === slug ? "true" : undefined} className={cn("pill backdrop-blur-sm")}>{s.name}</Link>
              ))}
            </nav>
          ) : null}
        </div>
        {image ? null : (
          <div className="hidden items-end gap-1 md:flex" aria-hidden="true">
            <Robin className="float-slow w-24" />
            <GiftBoxArt tone="green" className="-ml-3 w-24" />
            <GiftBoxArt tone="copper" className="-ml-6 w-16" />
          </div>
        )}
      </div>
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[-1px] z-[1] h-7 w-full text-brand-light" aria-hidden="true" focusable="false">
        <path d="M0 40V22c60 14 120 14 180 0s120-14 180 0 120 14 180 0 120-14 180 0 120 14 180 0 120-14 180 0 120 14 180 0 120-14 180 0V40z" fill="currentColor" />
      </svg>
    </section>
  );
}

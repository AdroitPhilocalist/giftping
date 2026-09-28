import Image from "next/image";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ShopfrontArt } from "@/components/art/ShopfrontArt";
import type { SiteImage } from "@/lib/content/imagery";

export interface VendorFeature {
  icon: LucideIcon;
  title: string;
  text: string;
}

/**
 * A boutique's front door: full-bleed banner photo running behind the header (the same -mt/pt trick as
 * HomeHero.tsx — see app/layout.tsx's <main> padding-top for why this works), the boutique's name on it,
 * and a short row of the first few trust features. Falls back through the same chain the old banner strip
 * used: the vendor's own uploaded photo, then a curated stock front, then the drawn shopfront.
 */
export function VendorHero({
  name,
  tagline,
  bannerUrl,
  fallbackImage,
  features,
}: {
  name: string;
  tagline: string | null;
  bannerUrl: string | null;
  fallbackImage: SiteImage | null;
  features: VendorFeature[];
}) {
  return (
    <section className="relative isolate -mt-[5.5rem] overflow-hidden pt-[5.5rem] lg:-mt-[6.5rem] lg:pt-[6.5rem]">
      <div className="absolute inset-0" aria-hidden="true">
        {bannerUrl ? (
          <Image src={bannerUrl} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        ) : fallbackImage ? (
          <Image src={fallbackImage.src} alt="" fill priority sizes="100vw" className="object-cover object-center" />
        ) : (
          <ShopfrontArt name={name} className="h-full w-full" />
        )}
        <div className="gp-hero-scrim absolute inset-0" />
      </div>

      <div className="relative flex min-h-[24rem] flex-col justify-end px-4 pb-10 pt-28 sm:px-6 lg:min-h-[28rem] lg:px-8 lg:pb-12">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rise max-w-xl">
            <p className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.3em] text-brand-secondary">
              <Link href="/vendors" className="hover:underline">Boutiques</Link>
              <span className="h-px flex-1 bg-brand-secondary/40" aria-hidden="true" />
            </p>
            <h1 className="mt-4 font-heading text-4xl leading-tight text-brand-on-primary sm:text-5xl">{name}</h1>
            {tagline ? <p className="mt-3 max-w-md text-base leading-relaxed text-brand-on-primary/80">{tagline}</p> : null}
          </div>

          {features.length > 0 ? (
            <ul className="rise mt-8 flex flex-wrap gap-x-10 gap-y-5" style={{ "--rise-delay": "120ms" } as React.CSSProperties}>
              {features.map(({ icon: Icon, title }) => (
                <li key={title} className="flex flex-col gap-2 text-brand-on-primary/90">
                  <Icon className="h-5 w-5 text-brand-secondary" strokeWidth={1.6} aria-hidden="true" />
                  <span className="max-w-[9rem] text-sm leading-snug">{title}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ViewTransition } from "react";
import { ArrowRight } from "lucide-react";
import { GlowCard } from "@/components/motion/GlowCard";
import { ShopfrontArt } from "@/components/art/ShopfrontArt";
import { VendorLogo } from "@/components/shop/VendorLogo";
import { defaultShopfrontImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import "./shop.css";

/** A stable pick from a slug, so a boutique always has the same awning and the same tint on its shopfront photo. */
export function streetLook(slug: string) {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { awning: (h % 4) + 1, hue: [-24, -10, 0, 14, 28, -36][h % 6] };
}

/** A boutique on Boutique Avenue: its shopfront (the vendor's own banner, a default shopfront photo, or a drawn one), its round logo hanging over the corner, its name and tagline. */
export async function VendorCard({
  vendor,
  compact = false,
}: {
  vendor: { business_name: string; slug: string; short_description: string | null; logo_url: string | null; banner_url?: string | null };
  /** For a two-per-row grid on phones: a shorter shopfront and smaller type below the `sm` breakpoint; identical to the full card from `sm` up. */
  compact?: boolean;
}) {
  const pick = (small: string, full: string) => (compact ? small : full);
  const look = streetLook(vendor.slug);
  const front = vendor.banner_url ? null : defaultShopfrontImage(vendor.slug, (await getActiveTheme()).id);
  return (
    <GlowCard className="h-full">
    <Link
      href={`/vendors/${vendor.slug}`}
      className="shopfront group block overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-surface shadow-card transition-shadow duration-500 hover:shadow-lift"
    >
      {/* the shopfront is the "door": on the way in, this exact picture grows into the boutique page's banner (components/shop/VendorHero.tsx) */}
      <ViewTransition name={`shop-${vendor.slug}`} share="gp-door" default="none">
      <div className={`relative ${pick("h-24 sm:h-40", "h-40")} overflow-hidden bg-gradient-to-b from-brand-primary-dark to-brand-primary`}>
        <span className={`awning awning--${look.awning}`} aria-hidden="true" />
        <span className="open-sign" aria-hidden="true">Open</span>
        <div className="shopfront-photo relative h-full w-full" style={{ ["--hue" as string]: vendor.banner_url ? "0deg" : `${look.hue}deg` }}>
          {vendor.banner_url ? (
            <Image src={vendor.banner_url} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="gp-glow-parallax object-cover" />
          ) : front ? (
            <Image src={front.src} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="gp-glow-parallax object-cover" />
          ) : (
            <ShopfrontArt name={vendor.business_name} />
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-primary-dark/60 to-transparent" />
      </div>
      </ViewTransition>
      <div className={`relative ${pick("px-3 pb-3.5 pt-7 sm:px-5 sm:pb-5 sm:pt-9", "px-5 pb-5 pt-9")}`}>
        <VendorLogo
          url={vendor.logo_url}
          name={vendor.business_name}
          sizeClass={pick("h-10 w-10 sm:h-14 sm:w-14", "h-14 w-14")}
          className={`absolute ${pick("-top-5 left-3 sm:-top-7 sm:left-5", "-top-7 left-5")} bg-brand-surface shadow-card ring-4 ring-brand-surface`}
        />
        <h3 className={`font-heading text-brand-dark ${pick("text-base leading-snug sm:text-xl", "text-xl")}`}>{vendor.business_name}</h3>
        {vendor.short_description ? <p className={`mt-1 line-clamp-2 text-brand-dark/65 ${pick("text-xs sm:text-sm", "text-sm")}`}>{vendor.short_description}</p> : null}
        <p className={`inline-flex items-center gap-1 font-medium text-brand-secondary-dark ${pick("mt-2 text-xs sm:mt-3 sm:text-sm", "mt-3 text-sm")}`}>
          Visit boutique <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </div>
    </Link>
    </GlowCard>
  );
}

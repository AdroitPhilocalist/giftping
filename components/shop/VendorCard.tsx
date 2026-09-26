import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
}: {
  vendor: { business_name: string; slug: string; short_description: string | null; logo_url: string | null; banner_url?: string | null };
}) {
  const look = streetLook(vendor.slug);
  const front = vendor.banner_url ? null : defaultShopfrontImage(vendor.slug, (await getActiveTheme()).id);
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="shopfront group block overflow-hidden rounded-card border border-brand-dark/[0.06] bg-brand-surface shadow-card transition-all duration-500 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <div className="relative h-40 overflow-hidden bg-gradient-to-b from-brand-primary-dark to-brand-primary">
        <span className={`awning awning--${look.awning}`} aria-hidden="true" />
        <span className="open-sign" aria-hidden="true">Open</span>
        <div className="shopfront-photo relative h-full w-full" style={{ ["--hue" as string]: vendor.banner_url ? "0deg" : `${look.hue}deg` }}>
          {vendor.banner_url ? (
            <Image src={vendor.banner_url} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
          ) : front ? (
            <Image src={front.src} alt="" fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover" />
          ) : (
            <ShopfrontArt name={vendor.business_name} />
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-brand-primary-dark/60 to-transparent" />
      </div>
      <div className="relative px-5 pb-5 pt-9">
        <VendorLogo url={vendor.logo_url} name={vendor.business_name} sizeClass="h-14 w-14" className="absolute -top-7 left-5 bg-brand-surface shadow-card ring-4 ring-brand-surface" />
        <h3 className="font-heading text-xl text-brand-dark">{vendor.business_name}</h3>
        {vendor.short_description ? <p className="mt-1 line-clamp-2 text-sm text-brand-dark/65">{vendor.short_description}</p> : null}
        <p className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-brand-secondary-dark">
          Visit boutique <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}

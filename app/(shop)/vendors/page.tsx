import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo/site-seo";
import Image from "next/image";
import { Ambience } from "@/components/shop/Ambience";
import { VendorCard } from "@/components/shop/VendorCard";
import { getApprovedVendors } from "@/lib/db/vendors";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";

export const generateMetadata = (): Promise<Metadata> => pageMetadata("vendors");

export default async function VendorsPage() {
  const [vendors, theme] = await Promise.all([getApprovedVendors(), getActiveTheme()]);
  const street = siteImage("world-boutiques", theme.id);

  return (
    <div>
      <section className="relative isolate overflow-hidden bg-brand-accent/70">
        {street ? (
          <div className="absolute inset-y-0 right-0 hidden w-[62%] [mask-image:linear-gradient(to_right,transparent_0%,black_45%)] md:block" aria-hidden="true">
            <Image src={street.src} alt="" fill priority sizes="60vw" className="world-photo object-cover" />
          </div>
        ) : null}
        <Ambience kind="sparks" count={12} />
        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
          <div className="rise max-w-xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-dark/60">GiftPing Mall</p>
            <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl lg:text-6xl">Boutique <span className="accent-word">Avenue</span></h1>
            <p className="mt-4 text-base leading-relaxed text-brand-dark/70">Every shopfront is a brand of its own — GiftPing Originals and the partner boutiques we&apos;ve handpicked. Walk down the street and step inside.</p>
          </div>
        </div>
        <svg viewBox="0 0 1440 40" preserveAspectRatio="none" className="absolute inset-x-0 bottom-[-1px] z-[1] h-7 w-full text-brand-light" aria-hidden="true" focusable="false">
          <path d="M0 40V22c60 14 120 14 180 0s120-14 180 0 120 14 180 0 120-14 180 0 120 14 180 0 120-14 180 0 120 14 180 0 120-14 180 0V40z" fill="currentColor" />
        </svg>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      </div>
    </div>
  );
}

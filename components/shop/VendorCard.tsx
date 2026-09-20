import Link from "next/link";
import { VendorLogo } from "@/components/shop/VendorLogo";

export function VendorCard({
  vendor,
}: {
  vendor: { business_name: string; slug: string; short_description: string | null; logo_url: string | null };
}) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-brand-dark/10 bg-brand-surface p-4 transition-shadow hover:shadow-md"
    >
      <VendorLogo url={vendor.logo_url} name={vendor.business_name} sizeClass="h-12 w-12" />
      <div className="min-w-0">
        <p className="truncate font-heading text-sm text-brand-dark">{vendor.business_name}</p>
        {vendor.short_description ? (
          <p className="truncate text-xs text-brand-dark/60">{vendor.short_description}</p>
        ) : null}
      </div>
    </Link>
  );
}

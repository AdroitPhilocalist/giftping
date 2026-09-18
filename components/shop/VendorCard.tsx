import Link from "next/link";
import { Store } from "lucide-react";

export function VendorCard({
  vendor,
}: {
  vendor: { business_name: string; slug: string; short_description: string | null; logo_url: string | null };
}) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="flex items-center gap-3 rounded-2xl border border-brand-dark/10 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark">
        <Store className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading text-sm text-brand-dark">{vendor.business_name}</p>
        {vendor.short_description ? (
          <p className="truncate text-xs text-brand-dark/60">{vendor.short_description}</p>
        ) : null}
      </div>
    </Link>
  );
}

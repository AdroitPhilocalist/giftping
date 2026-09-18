import { VendorCard } from "@/components/shop/VendorCard";
import { getApprovedVendors } from "@/lib/db/vendors";

export default async function VendorsPage() {
  const vendors = await getApprovedVendors();

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl text-brand-dark">Boutiques</h1>
      <p className="mt-2 text-brand-dark/60">
        Curated brand stores from GiftPing and our partner vendors.
      </p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <VendorCard key={vendor.id} vendor={vendor} />
        ))}
      </div>
    </div>
  );
}

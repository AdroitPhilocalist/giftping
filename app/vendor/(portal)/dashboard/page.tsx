import Link from "next/link";
import { AlertTriangle, Clock, PackageCheck, PackageX } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getVendorProductCounts, requireApprovedVendor } from "@/lib/db/vendor-portal";

export default async function VendorDashboardPage() {
  const { user, vendor } = await requireApprovedVendor();
  const counts = await getVendorProductCounts(vendor.id);

  const stats = [
    { label: "Live products", value: counts.active, icon: PackageCheck },
    { label: "Awaiting review", value: counts.pending, icon: Clock },
    { label: "Needs changes", value: counts.rejected, icon: PackageX },
    { label: "Low stock (≤5)", value: counts.lowStock, icon: AlertTriangle },
  ];

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Welcome back, {user.fullName.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Here&apos;s how {vendor.business_name} is doing in the mall.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <Icon className="h-5 w-5 text-brand-secondary-dark" />
            <p className="mt-3 font-heading text-3xl text-brand-dark">{value}</p>
            <p className="text-xs text-brand-dark/60">{label}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-heading text-lg text-brand-dark">Get started</h2>
        <p className="mt-1 text-sm text-brand-dark/60">
          New and edited products are reviewed by our team before they go live. Add clear photos and
          accurate stock to get approved faster.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/vendor/products/new">Add a product</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href={`/vendors/${vendor.slug}`}>View my storefront</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

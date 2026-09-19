import { PortalNav } from "@/components/vendor/PortalNav";
import { requireApprovedVendor } from "@/lib/db/vendor-portal";

const NAV = [
  { label: "Dashboard", href: "/vendor/dashboard" },
  { label: "Products", href: "/vendor/products" },
  { label: "Orders", href: "/vendor/orders" },
];

export default async function VendorPortalLayout({ children }: { children: React.ReactNode }) {
  // Also called by each page; getMyVendor/getServerUser are per-request memoized, so this is one lookup.
  const { vendor } = await requireApprovedVendor();

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 px-1 text-xs uppercase tracking-widest text-brand-dark/40">Vendor Portal</p>
        <p className="mb-4 px-1 font-heading text-lg text-brand-dark">{vendor.business_name}</p>
        <PortalNav items={NAV} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

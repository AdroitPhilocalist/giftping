import { PortalNav } from "@/components/vendor/PortalNav";
import { requireRole } from "@/lib/auth/session";

const NAV = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Returns", href: "/admin/returns" },
  { label: "Payouts", href: "/admin/settlements" },
  { label: "Coupons", href: "/admin/coupons" },
  { label: "Banners", href: "/admin/banners" },
  { label: "Themes", href: "/admin/themes" },
  { label: "Vendors", href: "/admin/vendors" },
  { label: "Corporate", href: "/admin/corporate-enquiries" },
  { label: "Users", href: "/admin/users" },
  { label: "Products", href: "/admin/products" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Product Types", href: "/admin/product-types" },
  { label: "Campaigns", href: "/admin/campaigns" },
  { label: "SEO", href: "/admin/seo" },
  { label: "Search", href: "/admin/search" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <p className="mb-4 px-1 text-xs uppercase tracking-widest text-brand-dark/40">Admin</p>
          <PortalNav items={NAV} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

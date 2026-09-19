import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/db/server";
import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const user = await requireRole("admin");
  const supabase = await createClient();

  const [vendors, products] = await Promise.all([
    supabase.from("vendors").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const queues = [
    { label: "Vendor applications", count: vendors.count ?? 0, href: "/admin/vendors" },
    { label: "Products awaiting review", count: products.count ?? 0, href: "/admin/products" },
  ];

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-brand-dark/60">
        Signed in as {user.fullName}. Revenue analytics, orders, coupons and content management arrive in Stage 11.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {queues.map((queue) => (
          <Link key={queue.href} href={queue.href}>
            <Card className="transition-shadow hover:shadow-md">
              <p className="font-heading text-4xl text-brand-dark">{queue.count}</p>
              <p className="text-sm text-brand-dark/60">{queue.label}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

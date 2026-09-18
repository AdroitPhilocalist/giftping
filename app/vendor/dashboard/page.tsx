import { requireRole } from "@/lib/auth/session";

export default async function VendorDashboardPage() {
  const user = await requireRole("vendor", "admin");

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Vendor Dashboard</h1>
      <p className="mt-2 text-sm text-brand-dark/60">
        Signed in as {user.fullName} ({user.role}). Onboarding, product catalog, and orders are built in
        Stage 4.
      </p>
    </div>
  );
}

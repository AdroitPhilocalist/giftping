import { requireRole } from "@/lib/auth/session";

export default async function AdminDashboardPage() {
  const user = await requireRole("admin");

  return (
    <div>
      <h1 className="font-heading text-3xl text-brand-dark">Admin Dashboard</h1>
      <p className="mt-2 text-sm text-brand-dark/60">
        Signed in as {user.fullName}. Platform metrics, vendor/product approval queues, and financial
        reports are built in Stage 11.
      </p>
    </div>
  );
}

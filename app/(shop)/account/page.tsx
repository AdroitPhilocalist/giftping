import { requireRole } from "@/lib/auth/session";
import { Card } from "@/components/ui/Card";

export default async function AccountPage() {
  const user = await requireRole("customer", "vendor", "admin");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-heading text-3xl text-brand-dark">My Account</h1>
      <Card className="mt-6">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-brand-dark/60">Name</dt>
            <dd className="font-medium text-brand-dark">{user.fullName}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/60">Email</dt>
            <dd className="font-medium text-brand-dark">{user.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-brand-dark/60">Role</dt>
            <dd className="font-medium capitalize text-brand-dark">{user.role}</dd>
          </div>
        </dl>
      </Card>
      <p className="mt-4 text-sm text-brand-dark/50">
        Order history, saved addresses, and wishlist arrive in later stages.
      </p>
    </div>
  );
}

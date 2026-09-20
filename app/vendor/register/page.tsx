import Link from "next/link";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { VendorApplicationForm } from "@/components/vendor/VendorApplicationForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getServerUser } from "@/lib/auth/session";
import { getMyVendor } from "@/lib/db/vendor-portal";

export default async function VendorRegisterPage() {
  const user = await getServerUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-heading text-3xl text-brand-dark">Become a GiftPing Vendor</h1>
        <p className="mt-2 text-brand-dark/60">
          Open a boutique in GiftPing Mall and reach shoppers looking for the perfect gift. Create an
          account or sign in first — it takes a minute.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link href="/sign-up">Create an account</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/sign-in?redirectTo=/vendor/register">Sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const vendor = await getMyVendor(user.id);
  const details = vendor ? (Array.isArray(vendor.details) ? vendor.details[0] : vendor.details) : null;

  if (vendor?.status === "approved") {
    return (
      <StatusCard icon={<CheckCircle2 className="h-8 w-8 text-brand-primary" />} title={`${vendor.business_name} is approved`}>
        <p className="text-brand-dark/60">Your boutique is live in the mall. Add your first products from your dashboard.</p>
        <Button asChild className="mt-5">
          <Link href="/vendor/dashboard">Go to vendor dashboard</Link>
        </Button>
      </StatusCard>
    );
  }

  if (vendor?.status === "rejected") {
    return (
      <StatusCard icon={<XCircle className="h-8 w-8 text-red-600" />} title="Your application wasn't approved">
        <p className="text-brand-dark/60">{details?.rejection_reason ?? "Please contact support for details."}</p>
      </StatusCard>
    );
  }

  if (vendor?.status === "suspended") {
    return (
      <StatusCard icon={<XCircle className="h-8 w-8 text-brand-secondary-dark" />} title="Your boutique is paused">
        <p className="text-brand-dark/60">
          {vendor.business_name} is currently paused and your products are hidden from shoppers. Orders that were already paid are being
          looked after by the GiftPing team. Please reply to the email we sent you, or contact support, to sort this out.
        </p>
      </StatusCard>
    );
  }

  if (vendor) {
    return (
      <StatusCard icon={<Clock className="h-8 w-8 text-brand-secondary-dark" />} title="Application under review">
        <p className="text-brand-dark/60">
          Thanks for applying, {vendor.business_name}. Our team reviews every application before a boutique
          goes live — you&apos;ll see the decision here and in your notifications.
        </p>
      </StatusCard>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-heading text-3xl text-brand-dark">Become a GiftPing Vendor</h1>
      <p className="mb-6 mt-2 text-brand-dark/60">
        Tell us about your business. We review each application before a boutique goes live.
      </p>
      <VendorApplicationForm />
    </div>
  );
}

function StatusCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card className="mx-auto max-w-xl text-center">
      <div className="mb-3 flex justify-center">{icon}</div>
      <h1 className="font-heading text-2xl text-brand-dark">{title}</h1>
      <div className="mt-2">{children}</div>
    </Card>
  );
}

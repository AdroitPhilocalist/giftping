import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Clock, PauseCircle, XCircle } from "lucide-react";
import { VendorApplicationForm } from "@/components/vendor/VendorApplicationForm";
import { VendorSignupLanding } from "@/components/vendor/VendorSignupLanding";
import { VendorStatusPanel } from "@/components/vendor/VendorStatusPanel";
import { Button } from "@/components/ui/Button";
import { getServerUser } from "@/lib/auth/session";
import { getMyVendor } from "@/lib/db/vendor-portal";
import { siteImage } from "@/lib/content/imagery";
import { getActiveTheme } from "@/lib/theme/active";
import { getCommerceSettings } from "@/lib/commerce/settings";

export const metadata: Metadata = { title: "Become a GiftPing Vendor" };

/**
 * /vendor/register — three different pages wearing one URL, so all three were rebuilt as one flow:
 *
 *  1. a SIGNED-OUT visitor gets the storefront pitch (components/vendor/VendorSignupLanding.tsx) — what the mall is, what a
 *     boutique gets, how approval works, and the money. It was previously a centred heading and two buttons.
 *  2. a signed-in applicant gets the five-step wizard (components/vendor/VendorApplicationForm.tsx) with a live shopfront preview.
 *  3. someone who has already applied gets their answer (components/vendor/VendorStatusPanel.tsx), with their own boutique drawn
 *     on it.
 *
 * The application itself is unchanged underneath: same schema, same `registerVendorAction`, same redirect behaviour, and the page
 * stays a public (non-gated) vendor path — see `isVendorPath` in lib/auth/paths.ts.
 */
export default async function VendorRegisterPage() {
  const user = await getServerUser();

  if (!user) {
    // The payout-hold fact is the platform's own live setting (see lib/commerce/settings.ts), never hardcoded, so the page can't
    // drift from what the payout functions actually do. The commission rate is deliberately not shown: it is set per boutique,
    // and the client asked that no number appear on public pages.
    const [theme, settings] = await Promise.all([getActiveTheme(), getCommerceSettings()]);
    return <VendorSignupLanding art={siteImage("world-boutiques", theme.id)} holdDays={settings.payoutHoldDays} />;
  }

  const vendor = await getMyVendor(user.id);
  const details = vendor ? (Array.isArray(vendor.details) ? vendor.details[0] : vendor.details) : null;

  if (vendor?.status === "approved") {
    return (
      <VendorStatusPanel
        businessName={vendor.business_name}
        eyebrow="Application approved"
        title={`${vendor.business_name} is live in the mall`}
        icon={<CheckCircle2 className="h-6 w-6 text-brand-primary" strokeWidth={1.7} aria-hidden="true" />}
        action={
          <Button asChild size="lg">
            <Link href="/vendor/dashboard">Go to vendor dashboard</Link>
          </Button>
        }
      >
        <p>
          Shoppers can find you on Boutique Avenue from now on. Your dashboard is where your products, orders, returns and payouts live — start by
          adding the first few products, and upload your shopfront banner and logo whenever you&apos;re ready.
        </p>
      </VendorStatusPanel>
    );
  }

  if (vendor?.status === "rejected") {
    return (
      <VendorStatusPanel
        businessName={vendor.business_name}
        eyebrow="Application not approved"
        title="Your application wasn't approved"
        icon={<XCircle className="h-6 w-6 text-red-600" strokeWidth={1.7} aria-hidden="true" />}
      >
        <p>{details?.rejection_reason ?? "Please contact support and we'll explain what happened."}</p>
        <p className="mt-3">
          If it was something fixable — a document, a registration number, a detail in your brand story — get in touch and we&apos;ll take another look.
        </p>
      </VendorStatusPanel>
    );
  }

  if (vendor?.status === "suspended") {
    return (
      <VendorStatusPanel
        businessName={vendor.business_name}
        eyebrow="Boutique paused"
        title={`${vendor.business_name} is paused`}
        icon={<PauseCircle className="h-6 w-6 text-brand-secondary-dark" strokeWidth={1.7} aria-hidden="true" />}
      >
        <p>
          Your boutique is currently paused and your products are hidden from shoppers. Orders that were already paid are being looked after by the
          GiftPing team.
        </p>
        <p className="mt-3">Please reply to the email we sent you, or contact support, and we&apos;ll sort this out with you.</p>
      </VendorStatusPanel>
    );
  }

  if (vendor) {
    return (
      <VendorStatusPanel
        businessName={vendor.business_name}
        eyebrow="Application received"
        title="Your application is under review"
        icon={<Clock className="h-6 w-6 text-brand-secondary-dark" strokeWidth={1.7} aria-hidden="true" />}
      >
        <p>
          Thanks for applying, {vendor.business_name}. Our team reviews every application before a boutique goes live — you&apos;ll see the decision
          here and in your notifications, and nothing you entered is shown to shoppers until then.
        </p>
      </VendorStatusPanel>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rise">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Vendor application</p>
        <h1 className="mt-3 font-heading text-4xl leading-tight text-brand-dark sm:text-5xl">
          Apply to sell on <span className="accent-word">GiftPing</span>.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-brand-dark/70">
          Four short sections — your business, your tax details, where we send your earnings, and where couriers collect from. Nothing is published
          until our team approves it, and you can step back to any section before you submit.
        </p>
      </div>
      <div className="mt-8">
        <VendorApplicationForm />
      </div>
    </div>
  );
}

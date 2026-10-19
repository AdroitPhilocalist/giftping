import type { ReactNode } from "react";
import { ShopfrontArt } from "@/components/art/ShopfrontArt";

/**
 * The single answer a returning applicant gets at /vendor/register: approved, waiting, rejected or paused.
 *
 * It is deliberately one shape rather than four screens — the applicant has one question ("where does my application stand?") and
 * should be able to tell the answer from the thumbnail. The boutique they applied with is drawn on the left, using the same
 * `ShopfrontArt` the live storefront falls back to, so the thing they are waiting for is visible rather than described.
 */
export function VendorStatusPanel({
  businessName,
  eyebrow,
  title,
  icon,
  children,
  action,
}: {
  businessName: string;
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl overflow-hidden rounded-card border border-brand-dark/[0.07] bg-brand-surface shadow-card sm:grid sm:grid-cols-[minmax(0,280px)_1fr]">
      <div className="relative aspect-[4/3] bg-gradient-to-b from-brand-primary-dark to-brand-primary sm:aspect-auto">
        <ShopfrontArt name={businessName} />
      </div>
      <div className="p-6 sm:p-8">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent">{icon}</span>
        <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">{eyebrow}</p>
        <h1 className="mt-2 font-heading text-2xl leading-snug text-brand-dark sm:text-3xl">{title}</h1>
        <div className="mt-3 text-sm leading-relaxed text-brand-dark/65">{children}</div>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

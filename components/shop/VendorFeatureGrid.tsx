import type { VendorFeature } from "@/components/shop/VendorHero";

/** The row of "why shop here" cards under a boutique's info block — the fuller version of VendorHero's icon row. */
export function VendorFeatureGrid({ features }: { features: VendorFeature[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      {features.map(({ icon: Icon, title, text }) => (
        <li key={title} className="rounded-card border border-brand-dark/[0.07] bg-brand-surface p-4">
          <Icon className="h-6 w-6 text-brand-secondary" strokeWidth={1.6} aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-brand-dark">{title}</p>
          <p className="mt-1 text-xs leading-snug text-brand-dark/55">{text}</p>
        </li>
      ))}
    </ul>
  );
}

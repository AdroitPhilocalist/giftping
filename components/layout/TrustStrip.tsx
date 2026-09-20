import { Headset, Heart, ShieldCheck, Store, Gift } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

const ITEMS = [
  { icon: Heart, title: "Curated with Love", text: "Handpicked gifts for every occasion" },
  { icon: Store, title: "Trusted Boutiques", text: "Premium brands and artisans" },
  { icon: ShieldCheck, title: "Secure & Reliable", text: "Safe payments and privacy guaranteed" },
  { icon: Gift, title: "Thoughtful Services", text: "Wrapping, messages and more" },
  { icon: Headset, title: "Customer Support", text: "We're here to make gifting effortless" },
] as const;

/** The quiet row of five promises that closes every shopping page (from the reference screens). */
export function TrustStrip() {
  return (
    <Reveal className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-card border border-brand-dark/[0.06] bg-brand-surface/80 p-5 shadow-card sm:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-brand-dark/[0.07]">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3 lg:px-4">
            <Icon className="mt-0.5 h-6 w-6 shrink-0 text-brand-secondary" strokeWidth={1.5} aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-brand-dark">{title}</p>
              <p className="mt-0.5 text-xs leading-snug text-brand-dark/60">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Reveal>
  );
}

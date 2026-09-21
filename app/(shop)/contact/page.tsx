import Link from "next/link";
import { Mail, PackageSearch, Phone, RotateCcw } from "lucide-react";
import { PageHero } from "@/components/pages/PageHero";
import { SITE } from "@/lib/site";

export const metadata = { title: "Contact — GiftPing", description: "Get help with an order, a return, or anything else." };

export default function ContactPage() {
  const cards = [
    { icon: PackageSearch, title: "Where is my order?", text: "Every order has its own page with a live progress bar and courier tracking.", href: "/account", cta: "Go to my account" },
    { icon: RotateCcw, title: "Return or refund", text: "Ask for a return from the order page, and read how refunds work.", href: "/refunds", cta: "Read the refund policy" },
  ];
  return (
    <div>
      <PageHero eyebrow="We’re here to help" title="Contact us" subtitle="For anything about an order, the quickest route is usually the order page. For everything else, write to us." />
      <div className="mx-auto grid max-w-4xl gap-5 px-4 py-12 sm:px-6 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.title} href={c.href} className="group rounded-card border border-brand-dark/[0.06] bg-brand-surface p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><c.icon className="h-6 w-6" strokeWidth={1.6} aria-hidden="true" /></span>
            <h2 className="mt-5 font-heading text-xl text-brand-dark">{c.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-dark/70">{c.text}</p>
            <p className="mt-4 text-sm font-medium text-brand-secondary-dark">{c.cta} →</p>
          </Link>
        ))}
      </div>
      <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="rounded-card border border-brand-secondary/20 bg-brand-accent/50 p-7">
          <h2 className="font-heading text-xl text-brand-dark">Write to us</h2>
          {SITE.supportEmail || SITE.supportPhone ? (
            <ul className="mt-4 space-y-3 text-brand-dark/80">
              {SITE.supportEmail ? <li className="flex items-center gap-3"><Mail className="h-5 w-5 text-brand-secondary" aria-hidden="true" /><a href={`mailto:${SITE.supportEmail}`} className="underline-offset-4 hover:underline">{SITE.supportEmail}</a></li> : null}
              {SITE.supportPhone ? <li className="flex items-center gap-3"><Phone className="h-5 w-5 text-brand-secondary" aria-hidden="true" /><a href={`tel:${SITE.supportPhone.replace(/\s/g, "")}`} className="underline-offset-4 hover:underline">{SITE.supportPhone}</a></li> : null}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-brand-dark/70">Our support contact details will be published here shortly. In the meantime, your order page shows everything we know about your parcel.</p>
          )}
          <p className="mt-4 text-xs text-brand-dark/55">Please include your order number so we can find it quickly.</p>
        </div>
      </div>
    </div>
  );
}

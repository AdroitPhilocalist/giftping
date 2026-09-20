import Link from "next/link";
import { Bird } from "lucide-react";
import { Jaali } from "@/components/ornaments/Jaali";
import { Logo } from "@/components/layout/Logo";
import { TrustStrip } from "@/components/layout/TrustStrip";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Occasions", href: "/categories" },
      { label: "Boutiques", href: "/vendors" },
      { label: "Personal Gifting Diary", href: "/diary" },
      { label: "Corporate Gifting", href: "/categories/corporate-gifting" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About Us", href: "/about" },
      { label: "Become a Vendor", href: "/vendor/register" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms & Conditions", href: "/terms" },
      { label: "Refund Policy", href: "/refunds" },
    ],
  },
];

export function Footer() {
  return (
    <>
      <TrustStrip />
      <footer className="relative mt-auto overflow-hidden bg-brand-primary text-brand-on-primary">
        <Jaali className="opacity-[0.07]" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <Logo tone="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-brand-on-primary/70">
              Your companion for every occasion — a virtual mall for thoughtful, celebratory gifting.
            </p>
            <p className="mt-6 flex items-center gap-2 font-heading text-lg italic text-brand-on-primary/85">
              <Bird className="h-4 w-4 text-brand-secondary" aria-hidden="true" /> Gifting, from the heart.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-secondary">{column.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-brand-on-primary/75 transition-colors duration-300 hover:text-brand-on-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="relative border-t border-brand-on-primary/10 px-4 py-4 text-center text-xs text-brand-on-primary/55">
          © {new Date().getFullYear()} GiftPing. All rights reserved.
        </div>
      </footer>
      {/* room for the fixed phone tab bar */}
      <div className="h-16 sm:hidden" aria-hidden="true" />
    </>
  );
}

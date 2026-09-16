import Link from "next/link";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "Occasions", href: "/occasions" },
      { label: "Boutiques", href: "/boutiques" },
      { label: "Personal Gifting Diary", href: "/diary" },
      { label: "Corporate Gifting", href: "/corporate-gifting" },
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
    <footer className="mt-auto border-t border-brand-dark/10 bg-brand-primary text-brand-light">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <span className="font-heading text-xl">GIFTPING</span>
          <p className="mt-3 max-w-xs text-sm text-brand-light/70">
            Your companion for every occasion — a virtual mall for thoughtful, celebratory
            gifting.
          </p>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-secondary">
              {column.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-brand-light/80 hover:text-brand-light">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-brand-light/10 px-4 py-4 text-center text-xs text-brand-light/60">
        © {new Date().getFullYear()} GiftPing. All rights reserved.
      </div>
    </footer>
  );
}

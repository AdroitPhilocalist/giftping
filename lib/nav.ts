/** The main navigation — one list used by the desktop header, the mobile menu and (partly) the footer. The Diary is deliberately NOT in it: it has its own button (components/layout/DiaryButton.tsx). */
export interface NavItem {
  label: string;
  href: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Explore Mall", href: "/mall" },
  { label: "Occasions", href: "/categories" },
  { label: "Boutiques", href: "/vendors" },
  { label: "Corporate Gifting", href: "/categories/corporate-gifting" },
  { label: "About Us", href: "/about" },
];

/** A link is "current" for its own page and everything beneath it ("/" only for the home page itself). */
export function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

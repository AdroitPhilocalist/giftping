"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid2x2, Heart, Home, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Categories", href: "/categories", icon: Grid2x2 },
  { label: "Cart", href: "/cart", icon: ShoppingBag },
  { label: "Wishlist", href: "/wishlist", icon: Heart },
  { label: "Account", href: "/account", icon: User },
] as const;

/** The phone bottom bar from the reference mobile screens. Hidden from tablet width up; the page reserves room for it (see the spacer in Navbar's siblings). */
export function MobileTabBar({ cartCount, wishlistCount }: { cartCount: number; wishlistCount: number }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Quick links" className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-dark/[0.08] bg-brand-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden">
      <ul className="grid grid-cols-5">
        {TABS.map(({ label, href, icon: Icon }) => {
          const current = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
          const count = label === "Cart" ? cartCount : label === "Wishlist" ? wishlistCount : 0;
          return (
            <li key={label}>
              <Link href={href} aria-current={current ? "page" : undefined} className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px] transition-colors", current ? "font-medium text-brand-secondary-dark" : "text-brand-dark/60")}>
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {count > 0 ? <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-secondary px-1 text-[10px] font-semibold text-brand-on-secondary">{count > 9 ? "9+" : count}</span> : null}
                </span>
                {label}
                {current ? <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-brand-secondary" aria-hidden="true" /> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

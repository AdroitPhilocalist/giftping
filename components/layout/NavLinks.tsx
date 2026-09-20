"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isCurrent } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

/** Desktop navigation. The current section gets the copper underline from the reference designs. */
export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden items-center gap-6 xl:flex 2xl:gap-8">
      {NAV_ITEMS.map((item) => {
        const current = isCurrent(pathname, item.href);
        return (
          <Link
            key={item.label}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap py-1 text-[0.9rem] font-medium transition-colors duration-300 after:absolute after:inset-x-0 after:-bottom-1 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-brand-secondary after:transition-transform after:duration-300 hover:text-brand-secondary-dark hover:after:scale-x-100",
              current ? "text-brand-secondary-dark after:scale-x-100" : "text-brand-dark/85",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

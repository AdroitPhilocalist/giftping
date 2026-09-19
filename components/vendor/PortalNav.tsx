"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export interface PortalNavItem {
  label: string;
  href: string;
}

export function PortalNav({ items }: { items: PortalNavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-brand-primary text-brand-light" : "text-brand-dark/70 hover:bg-brand-dark/5",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

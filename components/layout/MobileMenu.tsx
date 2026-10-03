"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Briefcase, BookHeart, ChevronRight, Compass, Gift, Info, Menu, Search, Store, X } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { NAV_ITEMS, isCurrent } from "@/lib/nav";
import { cn } from "@/lib/utils/cn";

const NAV_ICONS: Record<string, typeof Gift> = {
  "Explore Mall": Compass,
  Occasions: Gift,
  Boutiques: Store,
  "Corporate Gifting": Briefcase,
  "About Us": Info,
};

/** The phone/tablet menu. It slides in from the right, closes on navigation, traps focus (Radix) and is the only way to reach the links below the desktop breakpoint. */
export function MobileMenu({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button aria-label="Open menu" className="rounded-full p-2 text-brand-on-primary/85 transition-colors hover:bg-brand-on-primary/12 hover:text-brand-on-primary xl:hidden">
          <Menu className="h-5 w-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-brand-primary-dark/50 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,88vw)] flex-col bg-brand-light p-6 shadow-lift focus:outline-none"
        >
          <div className="flex items-center justify-between">
            <Dialog.Title asChild><span onClick={() => setOpen(false)}><Logo /></span></Dialog.Title>
            <Dialog.Close aria-label="Close menu" className="rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5"><X className="h-5 w-5" /></Dialog.Close>
          </div>

          <Link href="/search" onClick={() => setOpen(false)} className="mt-6 flex items-center gap-3 rounded-button border border-brand-dark/10 bg-brand-surface px-4 py-3 text-sm text-brand-dark/60">
            <Search className="h-4 w-4" /> Search for gifts, occasions, people…
          </Link>

          <nav aria-label="Menu" className="mt-6 flex-1 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const current = isCurrent(pathname, item.href);
              const Icon = NAV_ICONS[item.label] ?? Gift;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-4 py-3 font-heading text-lg transition-colors",
                    current ? "bg-brand-accent text-brand-secondary-dark" : "text-brand-dark hover:bg-brand-accent/60",
                  )}
                >
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", current ? "bg-brand-secondary text-brand-on-secondary" : "bg-brand-accent text-brand-secondary-dark")}>
                    <Icon className="h-4 w-4" strokeWidth={1.7} aria-hidden="true" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-brand-dark/25" aria-hidden="true" />
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2 border-t border-brand-dark/10 pt-4">
            <Link href="/diary" onClick={() => setOpen(false)} className="flex items-center justify-center gap-2 rounded-full bg-brand-secondary px-4 py-3 text-sm font-medium text-brand-on-secondary shadow-card">
              <BookHeart className="h-4 w-4" /> My Diary
            </Link>
            {!signedIn ? (
              <Link href="/sign-in" onClick={() => setOpen(false)} className="block rounded-full border border-brand-dark/20 px-4 py-3 text-center text-sm font-medium text-brand-dark">Sign in</Link>
            ) : (
              <Link href="/account" onClick={() => setOpen(false)} className="block rounded-full border border-brand-dark/20 px-4 py-3 text-center text-sm font-medium text-brand-dark">My account</Link>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

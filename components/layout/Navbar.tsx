import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";

const navLinks = [
  { label: "Explore Mall", href: "/" },
  { label: "Occasions", href: "/occasions" },
  { label: "Boutiques", href: "/boutiques" },
  { label: "Diaries", href: "/diary" },
  { label: "Corporate Gifting", href: "/corporate-gifting" },
  { label: "About Us", href: "/about" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-dark/5 bg-brand-light/95 backdrop-blur">
      <div className="bg-brand-primary px-4 py-2 text-center text-xs text-brand-light">
        Gift happiness. Create memories. Celebrate every occasion.
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-2xl font-semibold text-brand-primary">GP</span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-heading text-lg tracking-wide text-brand-dark">GIFTPING</span>
            <span className="text-[10px] tracking-wider text-brand-dark/50">
              YOUR COMPANION FOR EVERY OCCASION
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-brand-dark/80 transition-colors hover:text-brand-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            aria-label="Search"
            className="hidden rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5 sm:block"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            aria-label="Wishlist"
            className="hidden rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5 sm:block"
          >
            <Heart className="h-5 w-5" />
          </button>
          <Link
            href="/cart"
            aria-label="Cart"
            className="relative rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>
          <Button size="sm" className="hidden sm:inline-flex" asChild>
            <Link href="/diary">My Diary</Link>
          </Button>
          <button
            aria-label="Menu"
            className="rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

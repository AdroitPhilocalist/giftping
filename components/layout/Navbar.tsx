import Link from "next/link";
import { Heart, Menu, Search, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getCartCount } from "@/lib/commerce/cart";

const navLinks = [
  { label: "Explore Mall", href: "/" },
  { label: "Occasions", href: "/categories" },
  { label: "Boutiques", href: "/vendors" },
  { label: "Diaries", href: "/diary" },
  { label: "Corporate Gifting", href: "/categories/corporate-gifting" },
  { label: "About Us", href: "/about" },
];

export async function Navbar() {
  const user = await getServerUser();
  const [wishlistCount, cartCount] = await Promise.all([
    user ? getWishlistProductIds(user.id).then((ids) => ids.size) : 0,
    getCartCount(),
  ]);

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
          <Link
            href="/search"
            aria-label="Search"
            className="hidden rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5 sm:block"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/wishlist"
            aria-label="Wishlist"
            className="relative hidden rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5 sm:block"
          >
            <Heart className="h-5 w-5" />
            {wishlistCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-secondary text-[10px] font-semibold text-brand-dark">
                {wishlistCount}
              </span>
            ) : null}
          </Link>
          <Link
            href="/cart"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"}
            className="relative rounded-full p-2 text-brand-dark/70 hover:bg-brand-dark/5"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-semibold text-brand-light">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            ) : null}
          </Link>

          {user ? (
            <AccountMenu user={user} />
          ) : (
            <Button size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/sign-in">Sign In</Link>
            </Button>
          )}

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

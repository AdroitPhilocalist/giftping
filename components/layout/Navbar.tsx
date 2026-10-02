import Link from "next/link";
import { BookHeart, Heart, Search, ShoppingBag, User } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { HeaderShell } from "@/components/layout/HeaderShell";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { NavLinks } from "@/components/layout/NavLinks";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getServerUser } from "@/lib/auth/session";
import { getFeaturedCategories } from "@/lib/db/categories";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getFeaturedVendors } from "@/lib/db/vendors";
import { getCartCount } from "@/lib/commerce/cart";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

// The header is dark green (see .gp-header-inner in globals.css), so every icon/link inside it reads in cream, not the usual ink — hover fills with a soft
// cream wash rather than the usual dark one, and the "current" badge stays copper (the one accent that already reads clearly against forest green).
const iconButton = "relative rounded-full p-2 text-brand-on-primary/85 transition-colors duration-300 hover:bg-brand-on-primary/12 hover:text-brand-on-primary";
const badge = "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2 ring-brand-primary";
// A quieter "ghost" pill rather than a solid fill — the client's own reference shows it this way, and it reads as a natural part of the bar rather than
// competing with it; the copper accent still arrives on hover, so it isn't lost as an affordance. Shown from `2xl` (not `xl`): at `xl`/narrower-desktop
// widths (a very common laptop range, ~1280-1400px) the full row — logo, every nav link, all the icons, and this pill — doesn't actually fit, and with
// no wrapping the excess silently spills past the header's own rounded edge onto the plain page, where this pill's translucent cream styling (meant to
// be read against the dark bar) is nearly invisible (a real bug, reported directly, not a hypothetical). `.gp-diary-pill` below additionally hides it
// once condensed on scroll, where the pill's own width caps at a fixed 75rem regardless of viewport (see .gp-header[data-condensed] .gp-header-inner)
// and would overflow the same way at ANY desktop width. Nothing is lost by hiding it: "/diary" stays one click away via the "Diaries" nav link
// (lib/nav.ts) and AccountMenu's own "My Diary" item — this pill is a redundant, decorative emphasis on the same destination, not the only way there.
const diaryButton = "gp-diary-pill ml-1.5 hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-on-primary/35 bg-brand-on-primary/[0.06] px-5 py-2.5 text-sm font-medium text-brand-on-primary transition-all duration-300 hover:border-brand-secondary hover:bg-brand-secondary hover:text-brand-on-secondary 2xl:inline-flex";

export async function Navbar() {
  const user = await getServerUser();
  const [wishlistCount, cartCount, unreadCount, categories, vendors] = await Promise.all([
    user ? getWishlistProductIds(user.id).then((ids) => ids.size) : 0,
    getCartCount(),
    user ? getUnreadNotificationCount(user.id) : 0,
    getFeaturedCategories(),
    getFeaturedVendors(),
  ]);

  return (
    <>
      <HeaderShell>
        <div className="gp-header-inner gp-header-glass mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Logo className="shrink-0 xl:mr-4 2xl:mr-8" tone="light" priority />
          <NavLinks categories={categories} vendors={vendors} />

          <div className="flex items-center gap-0.5 sm:gap-1">
            <Link href="/search" aria-label="Search" className={iconButton}><Search className="h-5 w-5" /></Link>
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <Link href="/sign-in" aria-label="Sign in" className={`${iconButton} hidden sm:block`}><User className="h-5 w-5" /></Link>
            )}
            {user ? <NotificationBell unreadCount={unreadCount} /> : null}
            <Link href="/wishlist" aria-label={wishlistCount > 0 ? `Wishlist, ${wishlistCount} saved` : "Wishlist"} className={`${iconButton} hidden sm:block`}>
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 ? <span className={`${badge} bg-brand-secondary text-brand-on-secondary`}>{wishlistCount}</span> : null}
            </Link>
            <Link id="gp-cart-icon" href="/cart" aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart"} className={iconButton}>
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 ? <span className={`${badge} bg-brand-secondary text-brand-on-secondary`}>{cartCount > 99 ? "99+" : cartCount}</span> : null}
            </Link>
            <Link href="/diary" className={diaryButton}><BookHeart className="h-4 w-4" aria-hidden="true" />My Diary</Link>
            <MobileMenu signedIn={Boolean(user)} />
          </div>
        </div>
      </HeaderShell>
      <MobileTabBar cartCount={cartCount} wishlistCount={wishlistCount} />
    </>
  );
}

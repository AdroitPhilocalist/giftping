import Link from "next/link";
import { Heart, Search, ShoppingBag, User } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { NavLinks } from "@/components/layout/NavLinks";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getServerUser } from "@/lib/auth/session";
import { getWishlistProductIds } from "@/lib/db/wishlists";
import { getCartCount } from "@/lib/commerce/cart";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

const iconButton = "relative rounded-full p-2 text-brand-dark/75 transition-colors duration-300 hover:bg-brand-dark/5 hover:text-brand-dark";
const badge = "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold";

export async function Navbar({ announcement }: { announcement: string }) {
  const user = await getServerUser();
  const [wishlistCount, cartCount, unreadCount] = await Promise.all([
    user ? getWishlistProductIds(user.id).then((ids) => ids.size) : 0,
    getCartCount(),
    user ? getUnreadNotificationCount(user.id) : 0,
  ]);

  return (
    <>
      <AnnouncementBar message={announcement} />
      <header className="sticky top-0 z-40 border-b border-brand-dark/[0.06] bg-brand-light/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Logo className="shrink-0 xl:mr-6 2xl:mr-10" priority />
          <NavLinks />

          <div className="flex items-center gap-1 sm:gap-1.5">
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
            <Link href="/diary" className="ml-2 hidden whitespace-nowrap rounded-button bg-brand-primary px-5 py-2.5 text-sm font-medium text-brand-on-primary shadow-sm transition-all duration-300 hover:-translate-y-px hover:bg-brand-primary-dark hover:shadow-card xl:inline-flex">
              My Diary
            </Link>
            <MobileMenu signedIn={Boolean(user)} />
          </div>
        </div>
      </header>
      <MobileTabBar cartCount={cartCount} wishlistCount={wishlistCount} />
    </>
  );
}

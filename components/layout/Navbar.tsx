import Link from "next/link";
import { Heart, Search, User } from "lucide-react";
import { DiaryButton } from "@/components/layout/DiaryButton";
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
import { MiniBasket } from "@/components/layout/MiniBasket";
import { getUnreadNotificationCount } from "@/lib/db/notifications";

// The header is dark green (see .gp-header-inner in globals.css), so every icon/link inside it reads in cream, not the usual ink — hover fills with a soft
// cream wash rather than the usual dark one, and the "current" badge stays copper (the one accent that already reads clearly against forest green).
const iconButton = "relative rounded-full p-2 text-brand-on-primary/85 transition-colors duration-300 hover:bg-brand-on-primary/12 hover:text-brand-on-primary";
const badge = "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ring-2 ring-brand-primary";
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
            <MiniBasket cartCount={cartCount} iconClass={iconButton} badgeClass={`${badge} bg-brand-secondary text-brand-on-secondary`} />
            <DiaryButton />
            <MobileMenu signedIn={Boolean(user)} />
          </div>
        </div>
      </HeaderShell>
      <MobileTabBar cartCount={cartCount} wishlistCount={wishlistCount} />
    </>
  );
}

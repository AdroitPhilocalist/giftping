import Link from "next/link";
import { Heart, LayoutDashboard, Search, ShieldCheck, User } from "lucide-react";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { DiaryButton } from "@/components/layout/DiaryButton";
import { HeaderShell } from "@/components/layout/HeaderShell";
import { Logo } from "@/components/layout/Logo";
import { MobileMenu } from "@/components/layout/MobileMenu";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { NavLinks } from "@/components/layout/NavLinks";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { getServerUser } from "@/lib/auth/session";
import { getFeaturedCategories } from "@/lib/db/categories";
import { getActiveProductTypes } from "@/lib/db/product-types";
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
  const [wishlistCount, cartCount, unreadCount, categories, vendors, productTypes] = await Promise.all([
    user ? getWishlistProductIds(user.id).then((ids) => ids.size) : 0,
    getCartCount(),
    user ? getUnreadNotificationCount(user.id) : 0,
    getFeaturedCategories(),
    getFeaturedVendors(),
    getActiveProductTypes(),
  ]);
  const topLevelProductTypes = productTypes.filter((t) => !t.parent_id).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  return (
    <>
      <HeaderShell>
        <div className="gp-header-inner gp-header-glass mx-auto flex max-w-[92rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-6 2xl:px-8">
          <Logo className="shrink-0 xl:mr-4 2xl:mr-8" tone="light" priority />
          <NavLinks categories={categories} vendors={vendors} productTypes={topLevelProductTypes} />

          <div className="flex items-center gap-0.5 sm:gap-1">
            <DiaryButton />
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
            <MobileMenu signedIn={Boolean(user)} />

            {/* Role-based dashboard buttons — box office style, first-glance visible */}
            {user?.role === "vendor" && (
              <Link
                href="/vendor/dashboard"
                aria-label="Vendor Dashboard"
                className="flex items-center gap-1.5 rounded-full bg-brand-secondary px-4 py-2 text-brand-on-secondary font-medium shadow-xl hover:-translate-y-px hover:bg-brand-secondary-dark hover:shadow-2xl transition-all duration-300"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Vendor Dashboard</span>
              </Link>
            )}
            {user?.role === "admin" && (
              <Link
                href="/admin/dashboard"
                aria-label="Admin Dashboard"
                className="flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-2 text-brand-on-primary font-medium shadow-xl hover:-translate-y-px hover:bg-brand-primary-dark hover:shadow-2xl transition-all duration-300"
              >
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Admin Dashboard</span>
              </Link>
            )}
          </div>
        </div>
      </HeaderShell>
      <MobileTabBar cartCount={cartCount} wishlistCount={wishlistCount} />
    </>
  );
}

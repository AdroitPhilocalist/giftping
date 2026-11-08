/**
 * Path predicates shared by the middleware (`proxy.ts`) and by post-login redirect resolution
 * (`lib/auth/redirect.ts`). They live here, rather than inside `proxy.ts`, so the two can never
 * drift: deciding where to send someone after sign-in is only correct if it agrees with the routes
 * the middleware will actually let them open, and a divergence between the two is exactly what
 * produced the bug where a customer landed on the home page while the address bar still read
 * `/vendor/dashboard`.
 *
 * These are only used for the fast, "optimistic" UI-level bounce. The real security boundary is
 * `requireRole()` in `lib/auth/session.ts`, which re-reads the role from the database server-side.
 */

// Part of the storefront funnel, not the portal: anyone (including a signed-out visitor applying to
// sell) must be able to reach these. /vendor/terms is the seller-side terms the application form's own
// checkbox refers to, so it has to be readable before the applicant has an account.
export const VENDOR_PUBLIC_PATHS = ["/vendor/register", "/vendor/terms"];

export const DIARY_PATH = "/diary";
/** The sample diary guests may explore. It must never read the signed-in user's rows. */
export const DIARY_PREVIEW_PATH = "/diary/preview";

export function isDiaryPreviewPath(pathname: string) {
  return pathname === DIARY_PREVIEW_PATH || pathname.startsWith(`${DIARY_PREVIEW_PATH}/`);
}

export function isDiaryPath(pathname: string) {
  return pathname === DIARY_PATH || pathname.startsWith(`${DIARY_PATH}/`);
}

/** A sign-in link that returns the visitor to `redirectTo` (the real diary by default, not the sample). */
export function signInHref(redirectTo = DIARY_PATH) {
  return `/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`;
}

export function isProtectedCustomerPath(pathname: string) {
  return (
    pathname.startsWith("/account") ||
    (isDiaryPath(pathname) && !isDiaryPreviewPath(pathname)) ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/notifications")
  );
}

// Matches the /vendor/* portal (vendor/admin only) without also matching /vendors/* — the
// public shop's vendor storefront pages. `startsWith("/vendor")` alone catches both, since
// "/vendors/aurelia-gifts" starts with the substring "/vendor" too — confirmed by hand-testing
// (a signed-in customer got silently bounced from a public storefront page).
export function isVendorPath(pathname: string) {
  return (
    (pathname === "/vendor" || pathname.startsWith("/vendor/")) &&
    !VENDOR_PUBLIC_PATHS.some((path) => pathname.startsWith(path))
  );
}

export function isAdminPath(pathname: string) {
  return pathname.startsWith("/admin");
}

export function isAuthPath(pathname: string) {
  return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
}

import { isAdminPath, isVendorPath } from "@/lib/auth/paths";

/**
 * Post-login redirect targets come from a query string / form field, so they're attacker-controllable.
 * Only same-site absolute paths are allowed: "//evil.com" and "/\evil.com" both start with "/" but are
 * treated by browsers as protocol-relative URLs to another host.
 */
export function safeRedirectPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

/**
 * Where a *signed-in* user should land, given the page they were originally trying to reach.
 *
 * `safeRedirectPath` only guarantees the target is same-site; it says nothing about whether this
 * particular user is allowed to open it. That gap was a real bug: a guest bounced off
 * `/vendor/dashboard` was sent straight back there after signing in as a customer, and `proxy.ts`
 * then bounced them to `/` — but it did so on an RSC fetch the client follows silently, so the home
 * page rendered while the address bar still read `/vendor/dashboard`, and only a hard refresh
 * corrected it.
 *
 * Resolving the destination here, against the role read from the database, means the browser is only
 * ever sent somewhere the middleware will actually let it land. `role` is deliberately a plain
 * `string` (the DB column is `text` with a check constraint) so this module stays free of
 * `server-only` imports and can be exercised directly in tests.
 */
export function postLoginPath(value: unknown, role: string, fallback = "/"): string {
  const path = safeRedirectPath(value, fallback);
  if (isAdminPath(path) && role !== "admin") return fallback;
  if (isVendorPath(path) && role !== "vendor" && role !== "admin") return fallback;
  return path;
}

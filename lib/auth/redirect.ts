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

import { describe, expect, it } from "vitest";
import { postLoginPath, safeRedirectPath } from "./redirect";

describe("safeRedirectPath", () => {
  it("allows same-site paths, including query strings", () => {
    expect(safeRedirectPath("/cart")).toBe("/cart");
    expect(safeRedirectPath("/search?q=gift")).toBe("/search?q=gift");
  });
  it("rejects protocol-relative and absolute URLs", () => {
    expect(safeRedirectPath("//evil.com")).toBe("/");
    expect(safeRedirectPath("/\\evil.com")).toBe("/");
    expect(safeRedirectPath("https://evil.com")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
  });
  it("falls back for non-strings", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined, "/home")).toBe("/home");
  });
});

describe("postLoginPath", () => {
  it("keeps a destination every signed-in user may open", () => {
    expect(postLoginPath("/account/profile", "customer")).toBe("/account/profile");
    expect(postLoginPath("/orders", "customer")).toBe("/orders");
    expect(postLoginPath("/cart", "vendor")).toBe("/cart");
    expect(postLoginPath("/mall", "admin")).toBe("/mall");
  });

  it("sends a role bounced off a portal it can't enter back home, not into the portal", () => {
    // The bug this exists for: a customer who was redirected from /vendor/dashboard must not be
    // sent back there after signing in, or proxy.ts bounces them mid-redirect and the address bar
    // keeps the URL they were never allowed to open.
    expect(postLoginPath("/vendor/dashboard", "customer")).toBe("/");
    expect(postLoginPath("/admin/dashboard", "customer")).toBe("/");
    expect(postLoginPath("/admin/dashboard", "vendor")).toBe("/");
  });

  it("lets each role into its own portal", () => {
    expect(postLoginPath("/vendor/dashboard", "vendor")).toBe("/vendor/dashboard");
    expect(postLoginPath("/vendor/orders", "vendor")).toBe("/vendor/orders");
    expect(postLoginPath("/admin/dashboard", "admin")).toBe("/admin/dashboard");
    expect(postLoginPath("/admin/users", "admin")).toBe("/admin/users");
  });

  it("lets an admin into the vendor portal as well", () => {
    expect(postLoginPath("/vendor/dashboard", "admin")).toBe("/vendor/dashboard");
  });

  it("does not treat the public storefronts or the vendor sign-up page as a portal", () => {
    expect(postLoginPath("/vendors/aurelia-gifts", "customer")).toBe("/vendors/aurelia-gifts");
    expect(postLoginPath("/vendor/register", "customer")).toBe("/vendor/register");
    expect(postLoginPath("/vendors", "customer")).toBe("/vendors");
  });

  it("still strips off-site targets before the role check", () => {
    expect(postLoginPath("//evil.com", "admin")).toBe("/");
    expect(postLoginPath("https://evil.com", "admin")).toBe("/");
  });

  it("honours a custom fallback", () => {
    expect(postLoginPath("/vendor/dashboard", "customer", "/mall")).toBe("/mall");
    expect(postLoginPath(undefined, "customer", "/mall")).toBe("/mall");
  });
});

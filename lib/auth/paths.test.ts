import { describe, expect, it } from "vitest";
import { isAdminPath, isAuthPath, isProtectedCustomerPath, isVendorPath } from "./paths";

// These predicates are the single source of truth shared by proxy.ts (the fast UI bounce) and
// lib/auth/redirect.ts (where to send someone after sign-in), so they get their own tests.
describe("isVendorPath", () => {
  it("matches the portal only", () => {
    expect(isVendorPath("/vendor")).toBe(true);
    expect(isVendorPath("/vendor/dashboard")).toBe(true);
    expect(isVendorPath("/vendor/orders")).toBe(true);
  });
  it("does not match the public /vendors storefronts", () => {
    expect(isVendorPath("/vendors")).toBe(false);
    expect(isVendorPath("/vendors/aurelia-gifts")).toBe(false);
  });
  it("does not match the public vendor sign-up funnel", () => {
    expect(isVendorPath("/vendor/register")).toBe(false);
  });
  it("does not match the vendor terms, which the public application form links to", () => {
    expect(isVendorPath("/vendor/terms")).toBe(false);
  });
});

describe("isAdminPath", () => {
  it("matches the admin portal", () => {
    expect(isAdminPath("/admin/dashboard")).toBe(true);
    expect(isAdminPath("/admin/users")).toBe(true);
  });
  it("does not match ordinary routes", () => {
    expect(isAdminPath("/")).toBe(false);
    expect(isAdminPath("/account")).toBe(false);
  });
});

describe("isProtectedCustomerPath", () => {
  it("matches the signed-in customer areas", () => {
    for (const path of ["/account", "/account/profile", "/orders", "/diary", "/checkout", "/notifications"]) {
      expect(isProtectedCustomerPath(path)).toBe(true);
    }
  });
  it("does not match public routes", () => {
    expect(isProtectedCustomerPath("/")).toBe(false);
    expect(isProtectedCustomerPath("/mall")).toBe(false);
    expect(isProtectedCustomerPath("/vendors")).toBe(false);
  });
});

describe("isAuthPath", () => {
  it("matches sign-in and sign-up only", () => {
    expect(isAuthPath("/sign-in")).toBe(true);
    expect(isAuthPath("/sign-up")).toBe(true);
    expect(isAuthPath("/update-password")).toBe(false);
  });
});

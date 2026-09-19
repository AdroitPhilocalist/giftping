import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./redirect";

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

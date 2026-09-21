import { describe, expect, it } from "vitest";
import { DEFAULT_WRAP_STYLE, WRAP_STYLES, WRAP_STYLE_IDS, wrapStyleLabel } from "./wrap-styles";

describe("wrap styles", () => {
  it("has unique ids that match the database CHECK list", () => {
    expect(new Set(WRAP_STYLE_IDS).size).toBe(WRAP_STYLES.length);
    expect([...WRAP_STYLE_IDS].sort()).toEqual(["blue", "blush", "gold", "green", "ivory"]);
  });
  it("defaults to a real style", () => {
    expect(WRAP_STYLE_IDS).toContain(DEFAULT_WRAP_STYLE);
  });
  it("labels known ids and returns null for anything else", () => {
    expect(wrapStyleLabel("blush")).toBe("Blush Rose");
    expect(wrapStyleLabel("neon")).toBeNull();
    expect(wrapStyleLabel(null)).toBeNull();
  });
});

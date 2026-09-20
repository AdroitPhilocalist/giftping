import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_ID, THEMES, isThemeId, resolveTheme, schedulableThemes } from "./themes";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("theme registry", () => {
  it("always has a native default", () => {
    expect(THEMES[DEFAULT_THEME_ID].kind).toBe("native");
  });
  it("falls back to native for unknown, empty or hostile ids", () => {
    for (const bad of [undefined, null, "", "diwali", "__proto__", "constructor", "native ", "<script>"]) expect(resolveTheme(bad as string).id, String(bad)).toBe("native");
    expect(isThemeId("toString")).toBe(false);
  });
  it("resolves known ids", () => {
    expect(resolveTheme("demo-night").id).toBe("demo-night");
  });
  it("never offers demo or native themes for scheduling", () => {
    expect(schedulableThemes().every((t) => t.kind === "festival")).toBe(true);
  });
  it("every registered non-native theme has a stylesheet that defines its data-theme block and is imported by globals.css", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    for (const t of Object.values(THEMES).filter((x) => x.kind !== "native")) {
      const file = readFileSync(join(process.cwd(), "app/themes", `${t.id}.css`), "utf8");
      expect(file, t.id).toContain(`[data-theme="${t.id}"]`);
      expect(css, t.id).toContain(`./themes/${t.id}.css`);
    }
  });
});

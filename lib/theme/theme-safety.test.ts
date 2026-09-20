import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * THEME SAFETY. A festival theme works only because components never contain a colour of their own — they use tokens (bg-brand-*, text-brand-*, …) that
 * a theme redefines. This test fails the moment someone writes a raw colour into a component, so a Diwali or Christmas makeover can never be broken by
 * an innocent-looking `bg-white`. If you genuinely need an exception, add `theme-safe:` in a comment on that line and say why.
 *
 * Allowed on purpose: `text-white` and `bg-black/…` / `from-black/…` scrims over PHOTOGRAPHS (they don't depend on the theme), and the red family for
 * error/danger states (an error is red in every theme).
 */
const ROOT = process.cwd();
const SCAN = ["app", "components"];
const SKIP_DIRS = new Set(["node_modules", "themes", "api"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(full, out);
    } else if (/\.tsx$/.test(name)) out.push(full);
  }
  return out;
}

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  { name: "a hex colour", pattern: /#[0-9a-fA-F]{3,8}\b(?![\w-]*\))/ },
  { name: "rgb()/hsl() colour", pattern: /\b(?:rgb|hsl)a?\(/ },
  { name: "bg-white / border-white / ring-white (use bg-brand-surface)", pattern: /\b(?:bg|border|ring|divide|outline|fill|stroke)-white\b/ },
  { name: "text-black / bg-black without opacity (use brand-dark)", pattern: /\b(?:text-black|bg-black(?![/\w-])|border-black(?![/\w-]))/ },
  { name: "a non-brand palette colour (gray, blue, amber…)", pattern: /\b(?:bg|text|border|ring|from|to|via|fill|stroke|divide|outline)-(?:gray|slate|zinc|neutral|stone|blue|indigo|violet|purple|fuchsia|pink|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky)-\d{2,3}\b/ },
];

describe("theme safety: components use tokens, never raw colours", () => {
  const files = SCAN.flatMap((d) => walk(join(ROOT, d)));

  it("scans a meaningful number of files", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("finds no raw colours", () => {
    const offences: string[] = [];
    for (const file of files) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (/theme-safe:/.test(line) || /^\s*(\/\/|\*|\/\*)/.test(line)) return;
        for (const rule of FORBIDDEN) {
          if (rule.pattern.test(line)) offences.push(`${relative(ROOT, file)}:${i + 1}  ${rule.name}  →  ${line.trim().slice(0, 110)}`);
        }
      });
    }
    expect(offences, "\n" + offences.join("\n")).toEqual([]);
  });
});

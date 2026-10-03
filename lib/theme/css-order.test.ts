import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * CSS LAYER ORDER. Files like components/shop/shop.css are `@layer components` files. A layer's rank is fixed by the FIRST place it appears in the page's CSS.
 * If anything the ROOT layout renders imports such a file, it loads before globals.css (which declares Tailwind's layer order), `components` ends up BELOW
 * Tailwind's base reset, and every rule in it (filter chips, gift-tag cards…) silently loses to `* { padding: 0; border: 0 }` — the whole site looks unstyled.
 * This happened once (a festival component imported shop.css and was mounted in the root layout). So: nothing reachable from app/layout.tsx may import a
 * layered stylesheet; put such rules in app/globals.css instead.
 */
const ROOT = process.cwd();
const LAYERED = /@layer\s+components/;

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : spec.startsWith(".") ? resolve(dirname(from), spec) : null;
  if (!base) return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")]) {
    if (existsSync(candidate) && !readdirSafe(candidate)) return candidate;
  }
  return null;
}
function readdirSafe(p: string): boolean {
  try { readdirSync(p); return true; } catch { return false; }
}

describe("root layout CSS", () => {
  it("never pulls in a `@layer components` stylesheet", () => {
    const seen = new Set<string>();
    const offenders: string[] = [];
    const walk = (file: string) => {
      if (seen.has(file)) return;
      seen.add(file);
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/(?:import|export)\s[^"']*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g)) {
        const spec = m[1] ?? m[2];
        if (spec.endsWith(".css")) {
          const css = resolveImport(file, spec) ?? (spec.startsWith("@/") ? join(ROOT, spec.slice(2)) : resolve(dirname(file), spec));
          if (!css.endsWith("app/globals.css") && existsSync(css) && LAYERED.test(readFileSync(css, "utf8"))) offenders.push(`${file.replace(ROOT, "")} imports ${spec}`);
          continue;
        }
        const next = resolveImport(file, spec);
        if (next && /\.(tsx?|jsx?)$/.test(next)) walk(next);
      }
    };
    walk(join(ROOT, "app/layout.tsx"));
    expect(offenders).toEqual([]);
  });
});

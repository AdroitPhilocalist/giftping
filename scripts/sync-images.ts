/**
 * npm run images:sync — turns the artwork the client generated into optimised site images.
 *
 *   ui-references/batch-1/hero-atrium.png            ->  public/images/hero-atrium.webp             key "hero-atrium"
 *   ui-references/batch-1/diwali/hero-atrium.png     ->  public/images/diwali/hero-atrium.webp      key "diwali/hero-atrium"
 *
 * It resizes (heroes 2400px wide, the mall map 2000px, everything else 1600px), keeps transparency, and rewrites lib/content/imagery.manifest.json.
 * Components look images up by key (lib/content/imagery.ts) and fall back to a drawn placeholder when a key is missing.
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import sharp from "sharp";

const INBOX = join(process.cwd(), "ui-references", "batch-1");
const OUT = join(process.cwd(), "public", "images");
const MANIFEST = join(process.cwd(), "lib", "content", "imagery.manifest.json");

function walk(dir: string, found: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (/\.(png|jpe?g|webp)$/i.test(name)) found.push(full);
  }
  return found;
}

const widthFor = (stem: string) => (stem.startsWith("hero") ? 2400 : stem === "mall-map" ? 2000 : 1600);

(async () => {
  let files: string[] = [];
  try {
    files = walk(INBOX);
  } catch {
    console.log(`No inbox at ${INBOX} — create it and put the PNGs there.`);
    return;
  }
  const manifest: Record<string, { src: string; width: number; height: number }> = {};
  for (const file of files.sort()) {
    const rel = relative(INBOX, file);
    const stem = basename(rel, extname(rel));
    const folder = dirname(rel) === "." ? "" : dirname(rel).replace(/\\/g, "/");
    const key = folder ? `${folder}/${stem}` : stem;
    if (!/^[a-z0-9][a-z0-9/_-]*$/.test(key)) {
      console.warn(`skipped "${rel}": names must be lowercase letters, numbers, - or _`);
      continue;
    }
    const outFile = join(OUT, `${key}.webp`);
    mkdirSync(dirname(outFile), { recursive: true });
    // heroes are the biggest, most scrutinised images on the site (the homepage now runs one full-bleed) — worth a few more KB of quality than the rest.
    const info = await sharp(file).rotate().resize({ width: widthFor(stem), withoutEnlargement: true }).webp({ quality: stem.startsWith("hero") ? 90 : 84 }).toFile(outFile);
    manifest[key] = { src: `/images/${key}.webp`, width: info.width, height: info.height };
    console.log(`✓ ${key}  ${info.width}×${info.height}  ${(info.size / 1024).toFixed(0)}KB`);
  }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`\n${Object.keys(manifest).length} image(s) in the manifest.`);
})();

/**
 * Dev-only: cuts square "product photos" for the demo catalogue out of the client's own generated artwork (ui-references/batch-1/*.png), so demo products
 * have real pictures instead of the placeholder. Output goes to public/seed-images/ (never shipped to production — vendors upload their own photos there).
 *
 * Run with: npm run seed:images   (idempotent; overwrites)
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const SRC = "ui-references/batch-1";
const OUT = "public/seed-images";
mkdirSync(OUT, { recursive: true });

type Crop = { name: string; file: string; box?: { left: number; top: number; width: number; height: number }; flatten?: boolean };

// box = region in the source image's own pixels (world/diary/order images are 1672×941, shopfronts and cards 1536×1024, wraps 1254² with transparency)
const CROPS: Crop[] = [
  // gift boxes (transparent PNGs → flattened onto the site's cream)
  { name: "box-green", file: "wrap-green", flatten: true },
  { name: "box-blush", file: "wrap-blush", flatten: true },
  { name: "box-blue", file: "wrap-blue", flatten: true },
  { name: "box-gold", file: "wrap-gold", flatten: true },
  { name: "box-ivory", file: "wrap-ivory", flatten: true },
  // whole cards
  { name: "signature-box", file: "card-collections", box: { left: 256, top: 0, width: 1024, height: 1024 } },
  { name: "candle-shelf", file: "card-boutiques", box: { left: 256, top: 0, width: 1024, height: 1024 } },
  { name: "diary-pen", file: "card-diary", box: { left: 256, top: 0, width: 1024, height: 1024 } },
  { name: "ribbon-hands", file: "card-services", box: { left: 256, top: 0, width: 1024, height: 1024 } },
  // birthday
  { name: "rose-gold-gifts", file: "world-birthday", box: { left: 770, top: 420, width: 460, height: 460 } },
  { name: "balloons", file: "world-birthday", box: { left: 790, top: 0, width: 440, height: 470 } },
  { name: "gift-frame", file: "world-birthday", box: { left: 760, top: 540, width: 420, height: 380 } },
  // wedding
  { name: "trousseau-box", file: "world-wedding", box: { left: 1010, top: 330, width: 600, height: 600 } },
  { name: "brass-thali", file: "world-wedding", box: { left: 690, top: 480, width: 560, height: 260 } },
  { name: "potli", file: "world-wedding", box: { left: 1340, top: 520, width: 300, height: 340 } },
  { name: "garlands", file: "world-wedding", box: { left: 1230, top: 620, width: 440, height: 321 } },
  { name: "brass-lamp", file: "world-wedding", box: { left: 790, top: 150, width: 300, height: 480 } },
  // anniversary
  { name: "bouquet-vase", file: "world-anniversary", box: { left: 890, top: 200, width: 500, height: 460 } },
  { name: "candle-trio", file: "world-anniversary", box: { left: 690, top: 480, width: 440, height: 230 } },
  { name: "anniv-gift", file: "world-anniversary", box: { left: 1130, top: 520, width: 380, height: 260 } },
  // for her
  { name: "blush-gift", file: "world-for-her", box: { left: 960, top: 270, width: 500, height: 500 } },
  { name: "peony-bouquet", file: "world-for-her", box: { left: 1320, top: 60, width: 352, height: 480 } },
  { name: "silk-scarf", file: "world-for-her", box: { left: 1110, top: 430, width: 400, height: 500 } },
  { name: "jewellery-box", file: "world-for-her", box: { left: 945, top: 540, width: 260, height: 230 } },
  // for him
  { name: "leather-wallet", file: "world-for-him", box: { left: 520, top: 545, width: 470, height: 300 } },
  { name: "leather-journal", file: "world-for-him", box: { left: 800, top: 620, width: 720, height: 321 } },
  { name: "watch-box", file: "world-for-him", box: { left: 990, top: 470, width: 340, height: 250 } },
  { name: "exec-box", file: "world-for-him", box: { left: 1030, top: 230, width: 560, height: 470 } },
  // corporate / desk
  { name: "corp-box", file: "world-corporate-gifting", box: { left: 970, top: 370, width: 480, height: 400 } },
  { name: "corp-notebook", file: "world-corporate-gifting", box: { left: 410, top: 650, width: 660, height: 290 } },
  { name: "tea-cup", file: "diary-desk", box: { left: 840, top: 380, width: 300, height: 200 } },
  { name: "vase-candle", file: "diary-desk", box: { left: 1200, top: 380, width: 360, height: 300 } },
  { name: "blank-diary", file: "diary-desk", box: { left: 620, top: 520, width: 760, height: 340 } },
  // doorstep
  { name: "doorstep-gift", file: "order-hero", box: { left: 950, top: 450, width: 460, height: 370 } },
  { name: "lantern", file: "order-hero", box: { left: 800, top: 240, width: 300, height: 480 } },
  // boutiques
  { name: "perfume-window", file: "shopfront-perfume", box: { left: 80, top: 380, width: 350, height: 360 } },
  { name: "jewellery-window", file: "shopfront-jewellery", box: { left: 110, top: 500, width: 350, height: 230 } },
  { name: "flower-buckets", file: "shopfront-florist", box: { left: 130, top: 560, width: 520, height: 360 } },
  { name: "olive-planter", file: "shopfront-florist", box: { left: 420, top: 520, width: 300, height: 400 } },
  { name: "bouquet-shop", file: "shopfront-florist", box: { left: 1200, top: 600, width: 320, height: 320 } },
];

async function main() {
  for (const c of CROPS) {
    let img = sharp(join(SRC, `${c.file}.png`));
    if (c.box) img = img.extract(c.box);
    if (c.flatten) img = img.flatten({ background: "#f8e9da" });
    await img.resize(800, 800, { fit: "cover", position: "centre" }).webp({ quality: 82 }).toFile(join(OUT, `${c.name}.webp`));
    console.log("✓", c.name);
  }
  console.log(`\n${CROPS.length} seed images in ${OUT}/`);

  // Real product photography: drop <product-slug>.png (or .jpg) into ui-references/products/ and it becomes that product's main photo (the crops above are
  // stand-ins). seed-demo.ts prefers public/seed-images/product-<slug>.webp when it exists.
  const PRODUCTS_DIR = "ui-references/products";
  if (existsSync(PRODUCTS_DIR)) {
    for (const file of readdirSync(PRODUCTS_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))) {
      const slug = file.replace(/\.[^.]+$/, "");
      await sharp(join(PRODUCTS_DIR, file)).rotate().resize(1200, 1200, { fit: "cover", position: "centre" }).webp({ quality: 84 }).toFile(join(OUT, `product-${slug}.webp`));
      console.log("✓ product photo", slug);
    }
  }
}
void main();

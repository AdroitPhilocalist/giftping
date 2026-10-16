/**
 * Demo data: turns the near-empty dev database into something that feels like a working marketplace — more categories, ~10 boutiques, ~55 products with real
 * pictures (cut from the client's artwork by `npm run seed:images`), ~14 demo shoppers with addresses and reviews, ~40 orders in every stage of life (paid, packed,
 * shipped, delivered, one awaiting payment) with courier timelines, returns, coupons, homepage banners, and a full Personal Gifting Diary + wishlist +
 * notifications for the test customer.
 *
 * Everything goes through the same SQL functions the real site uses (place_order, confirm_order_payment, apply_shipment_update) so the numbers, stock,
 * commissions and order statuses are consistent — orders are then back-dated so charts and lists span the last ~6 weeks.
 *
 * Idempotent: every step is keyed on a stable slug / email / idempotency key, so it is safe to run again (already-seeded orders are skipped).
 * Dev database only. Demo accounts: demo.<firstname>@giftping.test, password TestPass123!  (same as the three test accounts).
 *
 * Run with: npm run seed:images && npm run seed:demo
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database, Json } from "../lib/db/types";
import { seedTaxonomy } from "./lib/taxonomy-seeder";

config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data with NODE_ENV=production");
const sb = createClient<Database>(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const PASSWORD = "TestPass123!";
const DAY = 86_400_000;
const now = Date.now();
const iso = (t: number) => new Date(t).toISOString();

// deterministic randomness so a re-run picks the same things
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Each entity (a product, an order plan, a review batch) re-seeds the generator from its own label, so the same run produces the same data whatever
// happened earlier — that is what makes re-running the seed safe (an order keeps its customer, a product keeps its stock, and so on).
let rand = rng(20260923);
const reseed = (label: string) => {
  rand = rng(parseInt(createHash("md5").update(label).digest("hex").slice(0, 8), 16));
};
const pick = <T,>(list: readonly T[]): T => list[Math.floor(rand() * list.length)];
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const uuidFrom = (text: string) => {
  const h = createHash("md5").update(text).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------------------------------------------------------------------------------------

const CATEGORIES = [
  { name: "Housewarming", slug: "housewarming", description: "For a new home and the people filling it.", sort_order: 7, is_featured: false },
  { name: "Thank You", slug: "thank-you", description: "Small gestures that say a lot.", sort_order: 8, is_featured: false },
  { name: "Festivals", slug: "festivals", description: "Diwali, Raksha Bandhan, Christmas and every celebration in between.", sort_order: 9, is_featured: true },
  { name: "Kids & Baby", slug: "kids-baby", description: "Gifts that make little ones light up.", sort_order: 10, is_featured: false },
] as const;

const VENDORS = [
  { slug: "lumen-and-ash", name: "Lumen & Ash", short: "Candles and home fragrance, hand-poured.", desc: "Small-batch candles, diffusers and brass candle holders, poured by hand in Jaipur. Every piece is designed to make a room feel like an occasion.", year: 2018, type: "Home & fragrance" },
  { slug: "saffron-and-silk", name: "Saffron & Silk", short: "Wedding gifting rooted in Indian craft.", desc: "Trousseau boxes, potlis and zari-work gifting from a family of weavers and embroiderers in Varanasi — made for weddings, engagements and blessings.", year: 2015, type: "Ethnic & bridal" },
  { slug: "the-brass-diya", name: "The Brass Diya", short: "Handcrafted brass for festivals and homes.", desc: "Lamps, thalis and pooja essentials cast by artisans in Moradabad and Kumbakonam. Made to be passed down.", year: 2012, type: "Festival & pooja" },
  { slug: "petal-and-bloom", name: "Petal & Bloom", short: "Fresh flowers and living gifts.", desc: "A florist and plant studio in Bengaluru arranging seasonal bouquets, planters and party decor — delivered the same week they are cut.", year: 2019, type: "Florist" },
  { slug: "cocoa-atelier", name: "Cocoa Atelier", short: "Artisan chocolates, mithai and hampers.", desc: "Small-batch chocolate, macarons and festive mithai, packed in boxes worth keeping. Made fresh to order in Mumbai.", year: 2017, type: "Chocolates & sweets" },
  { slug: "inkwell-and-co", name: "Inkwell & Co", short: "Leather goods and stationery for grown-ups.", desc: "Full-grain leather notebooks, wallets and desk pieces that can be monogrammed — the corporate and 'for him' gifting specialists.", year: 2016, type: "Leather & stationery" },
  { slug: "little-wonders", name: "Little Wonders", short: "Keepsakes and surprises for little ones.", desc: "Storybooks, plush and first-year keepsakes chosen by two mothers who were tired of plastic gifts.", year: 2020, type: "Kids & baby" },
  { slug: "vela-jewels", name: "Vela Jewels", short: "Fine and bridal jewellery.", desc: "Kundan, polki and everyday gold-plated jewellery, made in Jaipur and finished by hand.", year: 2014, type: "Jewellery" },
] as const;

type ProductSeed = {
  slug: string; name: string; vendor: string; category: string; price: number; sale?: number; images: string[]; short: string; desc: string;
  occ: string[]; rec: string[]; tags: string[]; variants?: { name: string; options: { value: string; adj: number }[] }[]; stock?: number; weight?: number; care?: string; gst?: number;
  /** product-type slug (see PRODUCT_TYPES) — the "what kind of thing is this" axis, separate from `category` (the occasion axis) */
  productType?: string;
  /** attribute key -> the one value this product has for it, e.g. { flavor: "Dark Chocolate" } */
  attrs?: Record<string, string>;
};

const SEED_IMG = (name: string) => `/seed-images/${name}.webp`;
// a real product photo (ui-references/products/<slug>.png, processed by `npm run seed:images`) replaces the stand-in crop as the main picture
const photosFor = (slug: string, crops: string[]) => (existsSync(`public/seed-images/product-${slug}.webp`) ? [`product-${slug}`, ...crops] : crops);

const PRODUCTS: ProductSeed[] = [
  // GiftPing Originals
  { slug: "signature-gift-box-forest-green", name: "Signature Gift Box — Forest Green", vendor: "giftping-originals", category: "birthday", price: 899, images: ["box-green"], short: "Our signature box, tied with a copper satin ribbon.", desc: "A rigid, magnetic-close gift box in deep forest green with a hand-tied copper satin bow. Arrives empty and ready for you to fill — or add any GiftPing product and we'll pack it inside.\n\nMade from recycled board with a soft-touch finish.", occ: ["birthday", "anniversary", "thank-you"], rec: ["for-her", "for-him", "for-parents"], tags: ["gift box", "signature", "ribbon"], variants: [{ name: "Size", options: [{ value: "Small", adj: 0 }, { value: "Medium", adj: 300 }, { value: "Large", adj: 600 }] }], weight: 600, productType: "gift-hampers-boxes" },
  { slug: "blush-rose-gift-box", name: "Blush Rose Gift Box", vendor: "giftping-originals", category: "for-her", price: 899, images: ["box-blush"], short: "Soft blush with a rose-gold ribbon.", desc: "A blush-pink presentation box finished with a rose-gold satin bow — the prettiest way to hand over something for her.", occ: ["birthday", "anniversary"], rec: ["for-her"], tags: ["gift box", "blush", "rose gold"], variants: [{ name: "Size", options: [{ value: "Small", adj: 0 }, { value: "Medium", adj: 300 }] }], weight: 600, productType: "gift-hampers-boxes" },
  { slug: "royal-blue-gift-box", name: "Royal Blue Gift Box", vendor: "giftping-originals", category: "for-him", price: 899, images: ["box-blue"], short: "Deep royal blue with a gold ribbon.", desc: "A confident royal-blue box with a wide gold ribbon. Sized to hold a wallet, watch or a stack of books.", occ: ["birthday", "thank-you"], rec: ["for-him", "for-colleagues"], tags: ["gift box", "blue", "gold"], weight: 600, productType: "gift-hampers-boxes" },
  { slug: "premium-gold-gift-box", name: "Premium Gold Gift Box", vendor: "giftping-originals", category: "wedding", price: 1099, images: ["box-gold"], short: "Rich gold with a cream satin bow.", desc: "For weddings and milestones: a gold presentation box with a cream satin ribbon and a slim card slot for a handwritten note.", occ: ["wedding", "anniversary"], rec: ["for-her", "for-him"], tags: ["gift box", "gold", "wedding"], variants: [{ name: "Size", options: [{ value: "Medium", adj: 0 }, { value: "Large", adj: 400 }] }], weight: 750, productType: "gift-hampers-boxes" },
  { slug: "ivory-and-sage-gift-box", name: "Ivory & Sage Gift Box", vendor: "giftping-originals", category: "housewarming", price: 899, images: ["box-ivory"], short: "Ivory with a sage-green ribbon.", desc: "A calm, natural-toned box for housewarmings and thank-yous. Pair it with a candle and it's done.", occ: ["housewarming", "thank-you"], rec: ["for-parents", "for-her"], tags: ["gift box", "ivory", "sage"], weight: 600, productType: "gift-hampers-boxes" },
  { slug: "emerald-and-copper-celebration-hamper", name: "Emerald & Copper Celebration Hamper", vendor: "giftping-originals", category: "birthday", price: 2499, sale: 2199, images: ["signature-box", "box-green"], short: "A curated hamper in our signature emerald box.", desc: "Our most-gifted hamper: a signature emerald box holding a scented candle, artisan chocolates, a brass keepsake and a handwritten card.\n\nEvery hamper is packed by hand by the GiftPing team in Bengaluru.", occ: ["birthday", "anniversary", "thank-you"], rec: ["for-her", "for-him", "for-parents"], tags: ["hamper", "curated", "bestseller"], variants: [{ name: "Wrapping Style", options: [{ value: "Classic Green", adj: 0 }, { value: "Blush Pink", adj: 0 }, { value: "Royal Blue", adj: 0 }, { value: "Premium Gold", adj: 150 }] }], weight: 1400, productType: "gift-hampers-boxes" },
  { slug: "journal-and-brass-pen-set", name: "The Journal & Brass Pen Set", vendor: "giftping-originals", category: "corporate-gifting", price: 1299, images: ["diary-pen"], short: "A cream-paper journal with a solid brass pen.", desc: "A hard-cover journal with 192 cream pages and a weighty brass pen that writes beautifully. A gift for anyone who thinks on paper.", occ: ["thank-you", "birthday"], rec: ["for-colleagues", "for-him", "for-her"], tags: ["journal", "stationery", "brass"], weight: 500, productType: "leather-stationery" },
  { slug: "signature-gift-wrapping-kit", name: "Signature Gift Wrapping Kit", vendor: "giftping-originals", category: "thank-you", price: 549, images: ["ribbon-hands"], short: "Kraft paper, satin ribbon, dried flowers and tags.", desc: "Everything to wrap it yourself like a professional: kraft paper, three satin ribbons, dried flower sprigs, twine and twelve gift tags.", occ: ["birthday", "thank-you", "housewarming"], rec: ["for-her", "for-parents"], tags: ["wrapping", "diy", "ribbon"], weight: 350, productType: "gift-hampers-boxes" },
  { slug: "handwritten-blessings-frame", name: "Handwritten Blessings Frame", vendor: "giftping-originals", category: "anniversary", price: 749, images: ["gift-frame"], short: "A gold frame we'll fill with your own message.", desc: "A slim gold frame with a cream card. Tell us what to write in the personalisation box and we'll hand-letter it before dispatch.", occ: ["anniversary", "birthday", "wedding"], rec: ["for-parents", "for-her"], tags: ["frame", "personalised", "calligraphy"], weight: 450, productType: "personalized-gifts" },
  { slug: "festive-diya-and-dry-fruit-hamper", name: "Festive Diya & Dry Fruit Hamper", vendor: "giftping-originals", category: "festivals", price: 1899, images: ["brass-thali"], short: "Brass diyas, kumkum and premium dry fruits.", desc: "A festive hamper with a small brass thali, two diyas, kumkum and a selection of almonds, cashews and pistachios.", occ: ["thank-you"], rec: ["for-parents", "for-colleagues"], tags: ["festival", "diwali", "hamper", "dry fruits"], weight: 1200, productType: "wedding-festive" },
  // Aurelia Gifts
  { slug: "rose-gold-celebration-gift-box", name: "Rose Gold Celebration Gift Box", vendor: "aurelia-gifts", category: "birthday", price: 1799, images: ["rose-gold-gifts"], short: "A trio of gifts tied in rose-gold ribbon.", desc: "Three small gifts — a scented candle, a keepsake dish and a bar of chocolate — wrapped in blush paper and finished with rose-gold ribbon.", occ: ["birthday"], rec: ["for-her"], tags: ["hamper", "rose gold", "birthday"], weight: 900, productType: "gift-hampers-boxes" },
  { slug: "blush-blossom-gift-box", name: "Blush Blossom Gift Box", vendor: "aurelia-gifts", category: "for-her", price: 2199, images: ["blush-gift"], short: "Patterned wrap, satin ribbon and a handwritten tag.", desc: "A luxuriously wrapped box holding a silk pouch, a floral candle and a small perfume rollerball. Comes with a tag written in your words.", occ: ["birthday", "anniversary"], rec: ["for-her"], tags: ["for her", "wrapped", "luxury"], weight: 800, productType: "gift-hampers-boxes" },
  { slug: "velvet-jewellery-box-pendant-set", name: "Velvet Jewellery Box with Pendant Set", vendor: "aurelia-gifts", category: "anniversary", price: 3499, sale: 2999, images: ["jewellery-box"], short: "A dainty pendant and studs in a blush velvet box.", desc: "A gold-plated pendant with matching stud earrings in a blush velvet presentation box.\n\nAnti-tarnish coated; keep away from perfume and water.", occ: ["anniversary", "birthday"], rec: ["for-her"], tags: ["jewellery", "pendant", "velvet"], weight: 200, care: "Store in the box. Avoid perfume, water and harsh chemicals.", productType: "pendants", attrs: {"metal":"Gold-plated"} },
  { slug: "floral-silk-scarf", name: "Floral Silk Scarf", vendor: "aurelia-gifts", category: "for-her", price: 1899, images: ["silk-scarf"], short: "A soft printed silk scarf in blush florals.", desc: "A 90×90 cm silk-blend scarf with a hand-drawn rose print. Lovely at the neck, on a handbag or in the hair.", occ: ["birthday", "anniversary", "thank-you"], rec: ["for-her", "for-parents"], tags: ["scarf", "silk", "floral"], weight: 150, care: "Dry clean recommended.", productType: "watches-accessories" },
  // Lumen & Ash
  { slug: "amber-glow-candle-and-diffuser-set", name: "Amber Glow Candle & Diffuser Set", vendor: "lumen-and-ash", category: "housewarming", price: 1499, images: ["candle-shelf"], short: "A soy candle and reed diffuser in warm amber.", desc: "A 220 g soy-wax candle (about 45 hours) and a 100 ml reed diffuser, both in a warm amber-and-cedar fragrance.", occ: ["housewarming", "thank-you", "birthday"], rec: ["for-her", "for-parents"], tags: ["candle", "diffuser", "home fragrance"], variants: [{ name: "Fragrance", options: [{ value: "Amber & Cedar", adj: 0 }, { value: "Jasmine & Sandal", adj: 0 }, { value: "Fig & Vanilla", adj: 100 }] }], weight: 900, productType: "candles-home-fragrance", attrs: {"scent":"Amber & Cedar"} },
  { slug: "dried-flower-vase-and-candle-set", name: "Dried Flower Vase & Candle Set", vendor: "lumen-and-ash", category: "housewarming", price: 1699, images: ["vase-candle"], short: "A ceramic bud vase with everlasting flowers and a candle.", desc: "A hand-thrown ceramic vase with a bunch of dried florals that last for years, and a matching amber candle.", occ: ["housewarming", "birthday"], rec: ["for-her", "for-parents"], tags: ["dried flowers", "vase", "candle"], weight: 1100, productType: "candles-home-fragrance" },
  { slug: "brass-lantern-candle-holder", name: "Brass Lantern Candle Holder", vendor: "lumen-and-ash", category: "festivals", price: 1199, images: ["lantern"], short: "A glass-and-brass lantern that glows all evening.", desc: "A tabletop lantern in aged brass with hurricane glass. Includes a pillar candle. Lovely for Diwali balconies and dinner tables alike.", occ: ["housewarming", "thank-you"], rec: ["for-parents"], tags: ["lantern", "brass", "diwali"], weight: 1300, productType: "home-living" },
  { slug: "romantic-candle-trio", name: "Romantic Candle Trio", vendor: "lumen-and-ash", category: "anniversary", price: 999, images: ["candle-trio"], short: "Three mini candles in gilded votives.", desc: "Three hand-poured mini candles in gilded glass votives with a rose-and-amber scent. The easiest way to set an evening.", occ: ["anniversary", "birthday"], rec: ["for-her", "for-him"], tags: ["candles", "romantic", "votive"], weight: 600, productType: "candles-home-fragrance" },
  { slug: "bone-china-tea-cup-and-saucer", name: "Bone China Tea Cup & Saucer", vendor: "lumen-and-ash", category: "thank-you", price: 899, sale: 799, images: ["tea-cup"], short: "Botanical bone china for slow mornings.", desc: "A fine bone-china cup and saucer with a hand-applied green botanical print and a gilded rim.", occ: ["thank-you", "housewarming", "birthday"], rec: ["for-parents", "for-her"], tags: ["tea", "china", "botanical"], weight: 450, productType: "home-living" },
  // Saffron & Silk
  { slug: "royal-zari-trousseau-box", name: "Royal Zari Trousseau Box", vendor: "saffron-and-silk", category: "wedding", price: 8999, sale: 7999, images: ["trousseau-box"], short: "A zari-brocade box with copper satin ribbon.", desc: "A brocade-wrapped trousseau box in gold zari with a copper satin bow, holding a silk stole, a potli and a small brass keepsake. The classic wedding gift, done well.", occ: ["wedding"], rec: ["for-her"], tags: ["wedding", "zari", "trousseau", "brocade"], variants: [{ name: "Colour", options: [{ value: "Gold & Copper", adj: 0 }, { value: "Ivory & Gold", adj: 0 }] }], weight: 2200, productType: "wedding-festive" },
  { slug: "silk-potli-bag-set-of-2", name: "Silk Potli Bag — Set of 2", vendor: "saffron-and-silk", category: "wedding", price: 1299, images: ["potli"], short: "Emerald silk potlis with tassels.", desc: "Two hand-stitched emerald silk potli bags with gold thread work and tassel closures — perfect for mehendi favours and bridesmaids.", occ: ["wedding", "festival"], rec: ["for-her"], tags: ["potli", "silk", "favours"], weight: 250, productType: "wedding-festive" },
  { slug: "rose-and-jasmine-festive-garland-set", name: "Rose & Jasmine Festive Garland Set", vendor: "saffron-and-silk", category: "festivals", price: 599, images: ["garlands"], short: "Artificial-flower garlands that look freshly strung.", desc: "Set of four reusable garlands in deep red roses, jasmine and gypsophila for doorways, mandaps and thalis.", occ: ["wedding", "housewarming"], rec: ["for-parents"], tags: ["garland", "decor", "wedding"], weight: 500, productType: "wedding-festive" },
  // The Brass Diya
  { slug: "brass-kumkum-thali-set", name: "Brass Kumkum Thali Set", vendor: "the-brass-diya", category: "festivals", price: 1599, images: ["brass-thali"], short: "A hand-hammered thali with diya and kumkum bowls.", desc: "A hand-hammered brass thali with a diya, a kumkum bowl and two small katoris. Heirloom quality for pooja and gifting.", occ: ["wedding", "housewarming"], rec: ["for-parents"], tags: ["brass", "thali", "pooja"], weight: 900, care: "Clean with tamarind and salt; wipe dry.", productType: "wedding-festive" },
  { slug: "kuthu-vilakku-brass-lamp", name: "Kuthu Vilakku Brass Lamp", vendor: "the-brass-diya", category: "festivals", price: 2299, images: ["brass-lamp"], short: "A tall traditional South Indian standing lamp.", desc: "A 24-inch brass kuthu vilakku cast in Kumbakonam. The classic housewarming gift.", occ: ["housewarming", "wedding"], rec: ["for-parents"], tags: ["brass", "lamp", "housewarming"], variants: [{ name: "Height", options: [{ value: "18 inch", adj: -400 }, { value: "24 inch", adj: 0 }, { value: "30 inch", adj: 900 }] }], weight: 2400, productType: "wedding-festive" },
  // Petal & Bloom
  { slug: "rose-and-ranunculus-bouquet", name: "Rose & Ranunculus Bouquet", vendor: "petal-and-bloom", category: "anniversary", price: 1299, images: ["bouquet-vase"], short: "Burgundy roses, blush ranunculus and baby's breath.", desc: "A hand-tied bouquet in deep burgundy roses, blush ranunculus and gypsophila. Flowers are cut to order and arrive in water.", occ: ["anniversary", "birthday"], rec: ["for-her"], tags: ["flowers", "roses", "bouquet"], variants: [{ name: "Size", options: [{ value: "Classic", adj: 0 }, { value: "Grand", adj: 700 }] }], weight: 900, gst: 5, productType: "flowers-plants" },
  { slug: "peony-rose-bouquet", name: "Peony Rose Bouquet", vendor: "petal-and-bloom", category: "birthday", price: 1499, images: ["peony-bouquet"], short: "Blush garden roses and pink peonies.", desc: "Soft blush garden roses with pink peonies and dusty miller, wrapped in kraft with a satin ribbon.", occ: ["birthday", "anniversary"], rec: ["for-her"], tags: ["flowers", "peony", "bouquet"], weight: 900, gst: 5, productType: "flowers-plants" },
  { slug: "seasonal-market-bouquet", name: "Seasonal Market Bouquet", vendor: "petal-and-bloom", category: "thank-you", price: 999, images: ["bouquet-shop"], short: "Whatever is best at the flower market today.", desc: "A generous mixed bouquet of the day's best stems from Bengaluru's flower market, tied by our florist.", occ: ["thank-you", "birthday"], rec: ["for-her", "for-parents"], tags: ["flowers", "seasonal", "bouquet"], weight: 800, gst: 5, productType: "flowers-plants" },
  { slug: "olive-tree-planter", name: "Olive Tree Planter", vendor: "petal-and-bloom", category: "housewarming", price: 1899, images: ["olive-planter"], short: "A young olive tree in a stone-finish planter.", desc: "A 60 cm olive tree in a stone-finish pot. Loves sun; forgiving of forgetful watering.", occ: ["housewarming"], rec: ["for-parents", "for-colleagues"], tags: ["plant", "planter", "olive"], weight: 4200, gst: 5, care: "Bright light, water when the top inch is dry.", productType: "plants", attrs: {"placement":"Indoor"} },
  { slug: "balloon-bouquet-and-confetti-party-kit", name: "Balloon Bouquet & Confetti Party Kit", vendor: "petal-and-bloom", category: "birthday", price: 1199, images: ["balloons"], short: "Champagne and blush balloons with gold confetti.", desc: "A ready-to-hang cluster of champagne, blush and confetti-filled balloons with ribbons, a bag of gold confetti and a foil banner.", occ: ["birthday"], rec: ["for-kids", "for-her"], tags: ["balloons", "party", "decor"], weight: 400, productType: "home-living" },
  { slug: "flower-bucket-studio-arrangement", name: "Flower Bucket Studio Arrangement", vendor: "petal-and-bloom", category: "housewarming", price: 2499, images: ["flower-buckets"], short: "An overflowing zinc bucket of seasonal flowers.", desc: "A statement arrangement in a reusable zinc bucket — peonies, hydrangea, roses and greenery. For openings, housewarmings and big thank-yous.", occ: ["housewarming", "wedding"], rec: ["for-parents", "for-colleagues"], tags: ["flowers", "arrangement", "bucket"], weight: 3000, gst: 5, productType: "flowers-plants" },
  // Cocoa Atelier
  { slug: "belgian-truffle-gift-box-24", name: "Belgian Truffle Gift Box (24 pcs)", vendor: "cocoa-atelier", category: "birthday", price: 1299, images: ["box-gold"], short: "Twenty-four hand-rolled truffles in a gold box.", desc: "Twenty-four hand-rolled Belgian chocolate truffles — dark, milk, salted caramel and hazelnut praline — in a gold keepsake box.", occ: ["birthday", "thank-you", "anniversary"], rec: ["for-her", "for-him", "for-colleagues"], tags: ["chocolate", "truffles", "sweet"], weight: 450, gst: 18, productType: "chocolates-sweets", attrs: {"flavor":"Assorted"} },
  { slug: "dark-chocolate-and-almond-hamper", name: "Dark Chocolate & Almond Hamper", vendor: "cocoa-atelier", category: "corporate-gifting", price: 1799, images: ["box-green"], short: "Bars, bark and roasted almonds in a green box.", desc: "Six single-origin dark chocolate bars, almond bark and salted roasted almonds, boxed for corporate gifting. Bulk pricing available.", occ: ["thank-you", "birthday"], rec: ["for-colleagues", "for-him"], tags: ["chocolate", "hamper", "corporate"], weight: 1000, gst: 18, productType: "chocolates-sweets", attrs: {"flavor":"Dark Chocolate"} },
  { slug: "festive-mithai-and-dry-fruits-box", name: "Festive Mithai & Dry Fruits Box", vendor: "cocoa-atelier", category: "festivals", price: 1599, sale: 1399, images: ["box-ivory"], short: "Kaju katli, pistachio barfi and dry fruits.", desc: "A festive box of kaju katli, pistachio barfi, anjeer rolls and premium dry fruits — made fresh three days before dispatch.", occ: ["thank-you"], rec: ["for-parents", "for-colleagues"], tags: ["mithai", "diwali", "sweets"], weight: 900, gst: 5, productType: "chocolates-sweets", attrs: {"flavor":"Mithai"} },
  { slug: "artisan-macaron-box-12", name: "Artisan Macaron Box (12)", vendor: "cocoa-atelier", category: "for-her", price: 1099, images: ["box-blush"], short: "Twelve macarons in six rose-and-pistachio flavours.", desc: "Twelve French macarons in six flavours: rose, pistachio, salted caramel, raspberry, coffee and dark chocolate.", occ: ["birthday", "anniversary"], rec: ["for-her"], tags: ["macarons", "sweet", "for her"], weight: 350, gst: 18, productType: "chocolates-sweets", attrs: {"flavor":"Assorted"} },
  // Inkwell & Co
  { slug: "executive-leather-notebook", name: "Executive Leather Notebook", vendor: "inkwell-and-co", category: "corporate-gifting", price: 1499, images: ["corp-notebook"], short: "Full-grain leather, 240 pages, optional monogram.", desc: "A refillable notebook in full-grain tan leather with 240 dot-grid pages. Add initials in the personalisation box for a gold-foil monogram.", occ: ["thank-you", "birthday"], rec: ["for-colleagues", "for-him"], tags: ["notebook", "leather", "corporate", "monogram"], weight: 450, productType: "leather-stationery" },
  { slug: "corporate-gift-box-forest-green", name: "Corporate Gift Box — Forest Green", vendor: "inkwell-and-co", category: "corporate-gifting", price: 2299, images: ["corp-box"], short: "A desk set in a forest green box with a ribbon tag.", desc: "A leather notebook, a brass pen and a marble coaster in a forest-green box with a copper ribbon and a card for your message.", occ: ["thank-you"], rec: ["for-colleagues"], tags: ["corporate", "desk", "gift box"], weight: 1100, productType: "gift-hampers-boxes" },
  { slug: "blank-leather-diary", name: "Blank Leather Diary", vendor: "inkwell-and-co", category: "corporate-gifting", price: 999, images: ["blank-diary"], short: "Cream pages, a ribbon marker, and room to think.", desc: "A slim, hard-bound diary with cream unlined pages and a copper ribbon bookmark.", occ: ["thank-you", "birthday"], rec: ["for-colleagues", "for-her"], tags: ["diary", "journal", "stationery"], weight: 380, productType: "leather-stationery" },
  { slug: "monogrammed-leather-wallet", name: "Monogrammed Leather Wallet", vendor: "inkwell-and-co", category: "for-him", price: 2199, images: ["leather-wallet"], short: "A slim bifold in cognac leather, with initials.", desc: "A slim six-card bifold in full-grain cognac leather. Add two or three initials and we'll emboss them in gold before dispatch.", occ: ["birthday", "anniversary"], rec: ["for-him"], tags: ["wallet", "leather", "monogram"], variants: [{ name: "Colour", options: [{ value: "Cognac", adj: 0 }, { value: "Black", adj: 0 }] }], weight: 120, productType: "leather-stationery" },
  { slug: "leather-journal-and-pen-set", name: "Leather Journal & Pen Set", vendor: "inkwell-and-co", category: "for-him", price: 1799, images: ["leather-journal"], short: "A leather journal and a gold-tone pen.", desc: "A refillable leather journal with a gold-foil title and a weighted gold-tone pen, boxed.", occ: ["birthday", "thank-you"], rec: ["for-him", "for-colleagues"], tags: ["journal", "pen", "leather"], weight: 520, productType: "leather-stationery" },
  { slug: "executive-watch-gift-box", name: "Executive Watch Gift Box", vendor: "inkwell-and-co", category: "for-him", price: 5999, sale: 5499, images: ["watch-box"], short: "A chronograph watch in a green presentation box.", desc: "A stainless-steel chronograph with a leather strap, presented in a green gift box with a ribbon and a card.", occ: ["birthday", "anniversary"], rec: ["for-him"], tags: ["watch", "chronograph", "luxury"], weight: 400, productType: "watches-accessories" },
  { slug: "the-journey-ahead-executive-hamper", name: "The Journey Ahead Executive Hamper", vendor: "inkwell-and-co", category: "corporate-gifting", price: 3999, images: ["exec-box"], short: "Watch, wallet and notebook in one box.", desc: "Our largest executive hamper: a leather wallet, a notebook, a gold pen and a chronograph watch in a forest-green box with a personal tag.", occ: ["thank-you", "birthday"], rec: ["for-him", "for-colleagues"], tags: ["hamper", "executive", "corporate"], weight: 1800, productType: "gift-hampers-boxes" },
  // Little Wonders
  { slug: "storybook-and-plush-gift-box", name: "Storybook & Plush Gift Box", vendor: "little-wonders", category: "kids-baby", price: 1399, images: ["box-blue"], short: "A picture book and a soft plush in a blue box.", desc: "A hardback picture book, a soft plush toy and a small blanket, gift-wrapped in blue and gold.", occ: ["birthday"], rec: ["for-kids"], tags: ["kids", "book", "plush"], weight: 800, productType: "baby-kids" },
  { slug: "babys-first-keepsake-box", name: "Baby's First Keepsake Box", vendor: "little-wonders", category: "kids-baby", price: 1899, images: ["box-ivory"], short: "A wooden memory box with milestone cards.", desc: "A wooden memory box with 24 milestone cards, a hand-print kit and a soft muslin swaddle.", occ: ["birthday", "housewarming"], rec: ["for-kids"], tags: ["baby", "keepsake", "newborn"], weight: 1100, productType: "baby-kids" },
  { slug: "birthday-surprise-box-for-kids", name: "Birthday Surprise Box for Kids", vendor: "little-wonders", category: "kids-baby", price: 1599, images: ["rose-gold-gifts"], short: "Three wrapped surprises for a birthday morning.", desc: "Three wrapped surprises — a storybook, a craft kit and a small toy — in a rose-gold box. The child unwraps them one by one.", occ: ["birthday"], rec: ["for-kids"], tags: ["kids", "birthday", "surprise"], weight: 900, productType: "baby-kids" },
  // Vela Jewels
  { slug: "kundan-bridal-necklace-set", name: "Kundan Bridal Necklace Set", vendor: "vela-jewels", category: "wedding", price: 12999, sale: 11499, images: ["jewellery-window"], short: "A kundan choker with matching earrings and tikka.", desc: "A hand-set kundan choker necklace with matching earrings and maang tikka, in an emerald-lined box.", occ: ["wedding"], rec: ["for-her"], tags: ["kundan", "bridal", "jewellery"], weight: 350, care: "Keep dry; store in the box.", productType: "necklaces", attrs: {"metal":"Kundan"} },
  { slug: "gold-plated-jhumka-earrings", name: "Gold-plated Jhumka Earrings", vendor: "vela-jewels", category: "for-her", price: 1799, images: ["jewellery-window", "jewellery-box"], short: "Everyday jhumkas in antique gold.", desc: "Lightweight antique-gold jhumkas with pearl drops. Comfortable enough for all-day wear.", occ: ["birthday", "wedding", "festival"], rec: ["for-her"], tags: ["earrings", "jhumka", "gold plated"], weight: 40, productType: "earrings", attrs: {"metal":"Gold-plated"} },
  // Lumière Keepsakes (owned by the test vendor account)
  { slug: "lumiere-personalised-photo-frame", name: "Personalised Photo Frame", vendor: "lumiere-keepsakes-c9cef8", category: "anniversary", price: 899, images: ["gift-frame"], short: "A gold frame with your names and date engraved.", desc: "A gold-finish 5×7 photo frame with your names and a date engraved on a brass plate.", occ: ["anniversary", "wedding", "birthday"], rec: ["for-parents", "for-her"], tags: ["frame", "personalised", "engraved"], weight: 500, productType: "personalized-gifts" },
  { slug: "lumiere-engraved-wooden-keepsake-box", name: "Engraved Wooden Keepsake Box", vendor: "lumiere-keepsakes-c9cef8", category: "anniversary", price: 1499, images: ["anniv-gift"], short: "A walnut box for letters and small treasures.", desc: "A hand-finished walnut keepsake box with a lid engraved with initials or a short line. Lined in green velvet.", occ: ["anniversary", "birthday"], rec: ["for-her", "for-him"], tags: ["keepsake", "wooden", "engraved"], weight: 700, productType: "personalized-gifts" },
  { slug: "lumiere-memory-scrapbook-album", name: "Memory Scrapbook Album", vendor: "lumiere-keepsakes-c9cef8", category: "birthday", price: 1199, images: ["blank-diary", "diary-pen"], short: "A linen scrapbook with kraft pages and photo corners.", desc: "A 40-page linen-bound scrapbook with kraft pages, photo corners and a set of gold pens.", occ: ["birthday", "anniversary", "wedding"], rec: ["for-parents", "for-her"], tags: ["scrapbook", "album", "memories"], weight: 650, productType: "personalized-gifts" },
  { slug: "lumiere-custom-name-necklace", name: "Custom Name Necklace", vendor: "lumiere-keepsakes-c9cef8", category: "for-her", price: 1999, images: ["jewellery-box"], short: "Your name in script, in gold-plated brass.", desc: "A delicate script name pendant on a gold-plated chain, made to order in 5–7 days.", occ: ["birthday", "anniversary"], rec: ["for-her"], tags: ["necklace", "custom", "personalised"], weight: 30, productType: "necklaces", attrs: {"metal":"Gold-plated"} },
];

// images for the products the base seed already created (they had none, or only the hamper)
const EXISTING_IMAGES: Record<string, string[]> = {
  "personalised-name-plate": ["gift-frame"],
  "vintage-luxe-perfume": ["perfume-window"],
  "signature-elegance-handbag": ["box-blush"],
  "mens-wallet-gift-set": ["leather-wallet", "watch-box"],
};

const PEOPLE = [
  { first: "Aarav", last: "Mehta", city: "Mumbai", state: "Maharashtra", pin: "400050", line: "12, Sea Breeze Apartments, Bandra West" },
  { first: "Priya", last: "Nair", city: "Kochi", state: "Kerala", pin: "682016", line: "41, Marine Drive Residency, Ernakulam" },
  { first: "Rohan", last: "Kapoor", city: "New Delhi", state: "Delhi", pin: "110017", line: "B-14, Malviya Nagar" },
  { first: "Ananya", last: "Iyer", city: "Chennai", state: "Tamil Nadu", pin: "600020", line: "7, Gandhi Nagar, Adyar" },
  { first: "Vikram", last: "Singh", city: "Jaipur", state: "Rajasthan", pin: "302001", line: "23, Civil Lines" },
  { first: "Sneha", last: "Reddy", city: "Hyderabad", state: "Telangana", pin: "500034", line: "302, Jubilee Heights, Banjara Hills" },
  { first: "Karan", last: "Malhotra", city: "Gurugram", state: "Haryana", pin: "122002", line: "Tower C, DLF Phase 2" },
  { first: "Meera", last: "Joshi", city: "Pune", state: "Maharashtra", pin: "411001", line: "5, Koregaon Park Lane" },
  { first: "Arjun", last: "Bose", city: "Kolkata", state: "West Bengal", pin: "700019", line: "18, Gariahat Road" },
  { first: "Ishita", last: "Sharma", city: "Lucknow", state: "Uttar Pradesh", pin: "226001", line: "9, Hazratganj" },
  { first: "Rahul", last: "Verma", city: "Bengaluru", state: "Karnataka", pin: "560001", line: "22, MG Road Residency" },
  { first: "Divya", last: "Pillai", city: "Thiruvananthapuram", state: "Kerala", pin: "695001", line: "3, Kowdiar Gardens" },
  { first: "Siddharth", last: "Rao", city: "Bengaluru", state: "Karnataka", pin: "560034", line: "46, 5th Block, Koramangala" },
  { first: "Neha", last: "Gupta", city: "Ahmedabad", state: "Gujarat", pin: "380015", line: "14, Satellite Road" },
] as const;

const REVIEW_POOL: Record<number, { title: string; body: string }[]> = {
  5: [
    { title: "Exactly what I hoped for", body: "Arrived beautifully packed and looked even better in person. She cried a little — the good kind." },
    { title: "Worth every rupee", body: "The quality is far better than I expected at this price. The finishing on the ribbon and the box made it feel like a proper luxury gift." },
    { title: "Perfect gift", body: "Ordered it for my parents' anniversary and it was the hit of the evening. Delivery was on time and nothing was damaged." },
    { title: "So thoughtful", body: "The personalised note was printed exactly as I typed it. It felt like a gift from someone who really knows them." },
    { title: "Beautiful craftsmanship", body: "You can tell this was made by hand. Heavy, well finished, and the colours are true to the photos." },
    { title: "Will order again", body: "Third time ordering from this boutique and they never disappoint. Packaging alone is worth it." },
    { title: "Lovely surprise", body: "Got it delivered to my friend's office as a surprise. She said she has never received such a well-wrapped gift." },
  ],
  4: [
    { title: "Very good, small quibble", body: "Lovely product and the packaging was excellent. The colour was a shade darker than the photo, but still gorgeous." },
    { title: "Great gift, slightly late", body: "The gift itself is beautiful. It arrived a day after promised, but the vendor kept me informed." },
    { title: "Good value", body: "Solid quality and a lovely presentation. I would have liked a bit more choice of sizes." },
    { title: "Happy with it", body: "Looks premium and my brother liked it a lot. Would recommend for the price." },
  ],
  3: [
    { title: "Nice, but not extraordinary", body: "Pretty and well made, but I expected slightly more for the price. Packaging was good." },
    { title: "Decent", body: "Did the job for a last-minute gift. The scent is lighter than I would have liked." },
  ],
};
const VENDOR_REPLIES = [
  "Thank you so much — this made our day. We hope it brings a smile every time you see it.",
  "We're so glad it arrived beautifully and on time. Thank you for trusting us with such a special gift.",
  "Thank you for the kind words! We'll pass them on to the team who made it.",
];

const COURIERS = ["Delhivery", "Blue Dart", "Ecom Express", "Xpressbees", "DTDC"];
const SHIP_CITIES = ["Bengaluru hub", "Hyderabad hub", "Nagpur sort centre", "Delhi gateway", "Mumbai hub", "Kolkata hub", "Chennai hub"];

// ---------------------------------------------------------------------------------------------------------------------------------------------------------
// steps
// ---------------------------------------------------------------------------------------------------------------------------------------------------------

async function ok<R extends { data: unknown; error: { message: string } | null }>(p: PromiseLike<R>, what: string): Promise<NonNullable<R["data"]>> {
  const { data, error } = await p;
  if (error) throw new Error(`${what}: ${error.message}`);
  if (data === null || data === undefined) throw new Error(`${what}: no data returned`);
  return data as NonNullable<R["data"]>;
}

async function ensureUser(email: string, fullName: string, phone?: string): Promise<string> {
  const { data: existing } = await sb.from("users").select("id").eq("email", email).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await sb.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  await sb.from("users").update({ full_name: fullName, phone: phone ?? null }).eq("id", data.user.id);
  return data.user.id;
}

async function reset() {
  console.log("Reset: removing demo orders, reviews, diary, notifications...");
  const demoUsers = await ok(sb.from("users").select("id").like("email", "demo.%@giftping.test"), "demo users");
  const demoIds = demoUsers.map((u) => u.id);
  const testCustomer = await ok(sb.from("users").select("id").eq("email", "test-customer@giftping.test").single(), "test customer");
  const ids = [...demoIds, testCustomer.id];
  await sb.from("return_requests").delete().in("customer_id", ids);
  await sb.from("orders").delete().in("customer_id", ids);
  await sb.from("reviews").delete().in("user_id", demoIds);
  await sb.from("wishlists").delete().in("user_id", ids);
  await sb.from("diary_contacts").delete().eq("user_id", testCustomer.id);
  await sb.from("gift_history").delete().eq("user_id", testCustomer.id);
  await sb.from("notifications").delete().eq("user_id", testCustomer.id);
  // put stock back where the demo orders took it from
  const low = await ok(sb.from("products").select("id, stock_quantity").lt("stock_quantity", 60), "low stock");
  for (const p of low) await sb.from("products").update({ stock_quantity: 60 + (p.stock_quantity % 40) }).eq("id", p.id);
  await sb.from("product_variants").update({ stock_quantity: 60 }).lt("stock_quantity", 40);
  await sb.from("banners").delete().in("headline", ["Wedding season is here", "Gifts for every heartbeat", "Corporate gifting, done right"]);
}

async function main() {
  if (process.argv.includes("--reset")) await reset();
  console.log("Tidying the test accounts...");
  const testCustomer = await ok(sb.from("users").select("id, role").eq("email", "test-customer@giftping.test").single(), "test customer");
  const testVendor = await ok(sb.from("users").select("id").eq("email", "test-vendor@giftping.test").single(), "test vendor");
  // earlier manual testing made the "customer" account own a boutique; hand that boutique to the vendor account so each test account is what its name says
  await sb.from("vendors").update({ user_id: testVendor.id }).eq("slug", "lumiere-keepsakes-c9cef8");
  if (testCustomer.role !== "customer") await sb.from("users").update({ role: "customer" }).eq("id", testCustomer.id);

  console.log("Categories...");
  await ok(sb.from("categories").upsert(CATEGORIES.map((c) => ({ ...c, theme_color: "#B75F22" })), { onConflict: "slug" }).select("id"), "categories");
  const categories = await ok(sb.from("categories").select("id, slug"), "categories read");
  const categoryId = new Map(categories.map((c) => [c.slug, c.id]));

  console.log("Product types...");
  // The full built-in taxonomy (lib/catalog/taxonomy.ts) — the same one `npm run seed:taxonomy` installs for a client. Overwrite keeps the dev database matching the file.
  const { typeIdBySlug: productTypeId, resolveAttributeId, added } = await seedTaxonomy(sb, { overwrite: true });
  console.log(`  ${productTypeId.size} product types in the database (${added.types} new, ${added.attributes} new attributes)`);

  console.log("Boutiques...");
  for (const v of VENDORS) {
    const row = await ok(
      sb.from("vendors").upsert({ slug: v.slug, business_name: v.name, short_description: v.short, description: v.desc, year_established: v.year, business_type: v.type, status: "approved", is_featured: true, approved_at: iso(now - int(40, 200) * DAY), support_email: `hello@${v.slug}.example` }, { onConflict: "slug" }).select("id").single(),
      `vendor ${v.slug}`,
    );
    await ok(sb.from("vendor_private").upsert({ vendor_id: row.id, commission_rate: null, legal_name: `${v.name} Pvt Ltd`, gstin: "29ABCDE1234F1Z5", pan: "ABCDE1234F", bank_account_name: v.name, bank_account_last4: "4821", bank_ifsc: "HDFC0001234" }, { onConflict: "vendor_id" }).select("vendor_id"), `vendor_private ${v.slug}`);
  }
  const vendors = await ok(sb.from("vendors").select("id, slug, business_name"), "vendors read");
  const vendorId = new Map(vendors.map((v) => [v.slug, v.id]));

  console.log("Products...");
  const existingProducts = await ok(sb.from("products").select("id, slug"), "products read");
  const existingBySlug = new Map(existingProducts.map((p) => [p.slug, p.id]));
  const productId = new Map<string, string>(existingBySlug);
  const productMeta = new Map<string, { vendorSlug: string; price: number; gst: number; variants: { id: string; name: string; value: string; adj: number }[]; name: string; image: string | null }>();

  for (const [index, p] of PRODUCTS.entries()) {
    reseed(`product:${p.slug}`);
    const vId = vendorId.get(p.vendor);
    const cId = categoryId.get(p.category);
    if (!vId || !cId) throw new Error(`Unknown vendor/category for ${p.slug}`);
    const base = {
      vendor_id: vId, category_id: cId, name: p.name, slug: p.slug, short_description: p.short, description: p.desc, base_price: p.price, sale_price: p.sale ?? null,
      occasion_tags: p.occ, recipient_tags: p.rec, tags: p.tags, thumbnail_url: SEED_IMG(photosFor(p.slug, p.images)[0]), is_in_house: p.vendor === "giftping-originals", status: "active",
      approved_at: iso(now - int(20, 150) * DAY), gst_rate: p.gst ?? 18, weight_grams: p.weight ?? 500, care_instructions: p.care ?? null, is_giftwrap_available: true,
      sku: `GP-${String(index + 100).padStart(4, "0")}`,
      product_type_id: p.productType ? (productTypeId.get(p.productType) ?? null) : null,
    };
    let id = existingBySlug.get(p.slug);
    if (id) {
      // keep stock / sold counters as they are; refresh the descriptive fields
      await ok(sb.from("products").update(base).eq("id", id).select("id"), `update ${p.slug}`);
    } else {
      const row = await ok(sb.from("products").insert({ ...base, stock_quantity: int(45, 160), total_sold: int(4, 260), view_count: 0 }).select("id").single(), `insert ${p.slug}`);
      id = row.id;
      if (p.variants) {
        const rows = p.variants.flatMap((g) => g.options.map((o) => ({ product_id: id!, name: g.name, value: o.value, price_adjustment: o.adj, stock_quantity: int(30, 90), is_active: true })));
        await ok(sb.from("product_variants").insert(rows).select("id"), `variants ${p.slug}`);
      }
    }
    productId.set(p.slug, id);
    await sb.from("product_images").delete().eq("product_id", id);
    await ok(sb.from("product_images").insert(photosFor(p.slug, p.images).map((img, i) => ({ product_id: id!, url: SEED_IMG(img), alt_text: p.name, sort_order: i, is_primary: i === 0 }))).select("id"), `images ${p.slug}`);

    await sb.from("product_attribute_values").delete().eq("product_id", id);
    if (p.attrs && p.productType) {
      const attrRows = Object.entries(p.attrs).flatMap(([key, value]) => {
        const attrId = resolveAttributeId(p.productType!, key);
        return attrId ? [{ product_id: id!, attribute_id: attrId, value }] : [];
      });
      if (attrRows.length > 0) await ok(sb.from("product_attribute_values").insert(attrRows).select("id"), `attribute values ${p.slug}`);
    }
  }
  for (const [slug, images] of Object.entries(EXISTING_IMAGES)) {
    const id = existingBySlug.get(slug);
    if (!id) continue;
    await sb.from("product_images").delete().eq("product_id", id);
    await sb.from("product_images").insert(images.map((img, i) => ({ product_id: id, url: SEED_IMG(img), alt_text: slug, sort_order: i, is_primary: i === 0 })));
    await sb.from("products").update({ thumbnail_url: SEED_IMG(images[0]) }).eq("id", id);
  }

  // metadata used when building orders
  const allProducts = await ok(sb.from("products").select("id, slug, name, base_price, sale_price, gst_rate, thumbnail_url, vendor:vendors(slug), variants:product_variants(id, name, value, price_adjustment, is_active)").eq("status", "active"), "products full read");
  for (const p of allProducts) {
    const vendor = p.vendor as { slug: string } | null;
    productMeta.set(p.id, { vendorSlug: vendor?.slug ?? "", price: Number(p.sale_price ?? p.base_price), gst: Number(p.gst_rate), variants: p.variants.filter((v) => v.is_active).map((v) => ({ id: v.id, name: v.name, value: v.value, adj: Number(v.price_adjustment) })), name: p.name, image: p.thumbnail_url });
  }
  console.log(`  ${allProducts.length} active products in the catalogue`);

  console.log("Demo shoppers, addresses...");
  const shopperIds: string[] = [];
  const addressByUser = new Map<string, Record<string, string>>();
  for (const [i, person] of PEOPLE.entries()) {
    const email = `demo.${person.first.toLowerCase()}@giftping.test`;
    const phone = `9${String(800000000 + i * 7919137).slice(0, 9)}`;
    const id = await ensureUser(email, `${person.first} ${person.last}`, phone);
    shopperIds.push(id);
    const addr = { label: "Home", recipient_name: `${person.first} ${person.last}`, phone, address_line1: person.line, address_line2: "", landmark: "", city: person.city, state: person.state, pincode: person.pin, country: "India" };
    addressByUser.set(id, addr);
    const { count } = await sb.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", id);
    if (!count) await ok(sb.from("addresses").insert({ user_id: id, ...addr, address_line2: null, landmark: null, is_default: true }).select("id"), "address");
  }
  // the test customer gets two addresses
  const tcAddrs = [
    { label: "Home", recipient_name: "Test Customer", phone: "9876543210", address_line1: "21, Lake View Apartments, Indiranagar", address_line2: "", landmark: "Near the metro station", city: "Bengaluru", state: "Karnataka", pincode: "560038", country: "India" },
    { label: "Parents", recipient_name: "Sunita Customer", phone: "9845012345", address_line1: "8, Nehru Road, Sadashiv Nagar", address_line2: "", landmark: "", city: "Pune", state: "Maharashtra", pincode: "411001", country: "India" },
  ];
  const { count: tcCount } = await sb.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", testCustomer.id);
  if (!tcCount) await ok(sb.from("addresses").insert(tcAddrs.map((a, i) => ({ user_id: testCustomer.id, ...a, address_line2: null, landmark: a.landmark || null, is_default: i === 0 }))).select("id"), "test customer addresses");
  addressByUser.set(testCustomer.id, tcAddrs[0]);

  console.log("Reviews...");
  const reviewers = shopperIds;
  const existingReviews = await ok(sb.from("reviews").select("product_id, user_id"), "reviews read");
  const reviewed = new Set(existingReviews.map((r) => `${r.product_id}:${r.user_id}`));
  let reviewCount = 0;
  for (const p of PRODUCTS) {
    reseed(`reviews:${p.slug}`);
    const pid = productId.get(p.slug)!;
    const n = int(2, 6);
    const chosen = [...reviewers].sort(() => rand() - 0.5).slice(0, n);
    for (const uid of chosen) {
      if (reviewed.has(`${pid}:${uid}`)) continue;
      const r = rand();
      const rating = r < 0.62 ? 5 : r < 0.9 ? 4 : 3;
      const t = pick(REVIEW_POOL[rating]);
      const reply = rating >= 4 && rand() < 0.25 ? pick(VENDOR_REPLIES) : null;
      const { error } = await sb.from("reviews").insert({ product_id: pid, user_id: uid, rating, title: t.title, body: t.body, is_verified_purchase: rand() < 0.6, vendor_response: reply, vendor_response_at: reply ? iso(now - int(1, 20) * DAY) : null, created_at: iso(now - int(2, 60) * DAY) });
      if (error) throw new Error(`review ${p.slug}: ${error.message}`);
      reviewCount++;
    }
  }
  console.log(`  ${reviewCount} new reviews`);
  // boutique ratings mirror their products' reviews (the table has no trigger for this rollup)
  const perVendor = await ok(sb.from("products").select("vendor_id, average_rating, review_count").gt("review_count", 0), "rating rollup");
  const agg = new Map<string, { sum: number; n: number }>();
  for (const p of perVendor) {
    const a = agg.get(p.vendor_id) ?? { sum: 0, n: 0 };
    a.sum += Number(p.average_rating) * p.review_count;
    a.n += p.review_count;
    agg.set(p.vendor_id, a);
  }
  for (const [vid, a] of agg) await sb.from("vendors").update({ average_rating: round2(a.sum / a.n), review_count: a.n }).eq("id", vid);

  console.log("Coupons...");
  const coupons = [
    { code: "WELCOME10", description: "10% off your first order", discount_type: "percentage", discount_value: 10, max_discount_amount: 250, min_order_amount: 499, per_user_limit: 1, usage_limit: 1000, valid_from: iso(now - 30 * DAY), valid_until: iso(now + 120 * DAY) },
    { code: "FESTIVE15", description: "15% off festive gifting", discount_type: "percentage", discount_value: 15, max_discount_amount: 600, min_order_amount: 1499, per_user_limit: 2, usage_limit: 500, valid_from: iso(now - 5 * DAY), valid_until: iso(now + 40 * DAY) },
    { code: "FLAT200", description: "₹200 off orders above ₹1,299", discount_type: "fixed", discount_value: 200, max_discount_amount: null, min_order_amount: 1299, per_user_limit: 3, usage_limit: null, valid_from: iso(now - 10 * DAY), valid_until: null },
    { code: "DIWALI25", description: "Diwali sale (ended)", discount_type: "percentage", discount_value: 25, max_discount_amount: 800, min_order_amount: 1999, per_user_limit: 1, usage_limit: 300, valid_from: iso(now - 120 * DAY), valid_until: iso(now - 60 * DAY) },
    { code: "NEWYEAR20", description: "New Year gifting (starts soon)", discount_type: "percentage", discount_value: 20, max_discount_amount: 700, min_order_amount: 1499, per_user_limit: 1, usage_limit: 400, valid_from: iso(now + 80 * DAY), valid_until: iso(now + 100 * DAY) },
  ];
  for (const c of coupons) {
    const { data: ex } = await sb.from("coupons").select("id").eq("code", c.code).maybeSingle();
    if (!ex) await ok(sb.from("coupons").insert({ ...c, is_active: true }).select("id"), `coupon ${c.code}`);
  }

  console.log("Homepage banners...");
  const banners = [
    { headline: "Wedding season is here", subheading: "Trousseau boxes, potlis and blessings — from boutiques rooted in Indian craft.", cta_text: "Explore wedding gifts", cta_url: "/categories/wedding", image: "world-wedding", alt: "A wedding gift box tied with copper ribbon on a green silk drape" },
    { headline: "Gifts for every heartbeat", subheading: "Roses, candlelight and something small in a green box.", cta_text: "Anniversary gifts", cta_url: "/categories/anniversary", image: "world-anniversary", alt: "A candlelit anniversary table with roses and a wrapped gift" },
    { headline: "Corporate gifting, done right", subheading: "Executive hampers, leather goods and bulk orders with monograms.", cta_text: "See corporate gifts", cta_url: "/categories/corporate-gifting", image: "world-corporate-gifting", alt: "A desk with a green gift box, leather notebook and brass pen" },
  ];
  for (const [i, b] of banners.entries()) {
    const { data: ex } = await sb.from("banners").select("id").eq("headline", b.headline).maybeSingle();
    if (ex) continue;
    await ok(sb.from("banners").insert({ headline: b.headline, subheading: b.subheading, cta_text: b.cta_text, cta_url: b.cta_url, image_url: `/images/${b.image}.webp`, image_medium_url: `/images/${b.image}.webp`, alt_text: b.alt, target_audience: "all", is_active: true, sort_order: (i + 1) * 10 }).select("id"), "banner");
  }

  console.log("Orders...");
  type Plan = { customer: string; daysAgo: number; stage: "delivered" | "out_for_delivery" | "in_transit" | "picked_up" | "packed" | "paid" | "draft"; tag: string };
  reseed("plans");
  const plans: Plan[] = [];
  const add = (customer: string, daysAgo: number, stage: Plan["stage"]) => plans.push({ customer, daysAgo, stage, tag: `demo-order-${plans.length + 1}` });
  // test customer: one order in each state, so /orders shows a full range and every action can be tried
  add(testCustomer.id, 21, "delivered");
  add(testCustomer.id, 12, "delivered");
  add(testCustomer.id, 3, "delivered"); // inside the 7-day return window
  add(testCustomer.id, 4, "in_transit");
  add(testCustomer.id, 1, "packed");
  // everyone else
  for (let i = 0; i < 26; i++) add(pick(shopperIds), int(8, 44), "delivered");
  for (let i = 0; i < 4; i++) add(pick(shopperIds), int(3, 6), pick(["in_transit", "out_for_delivery", "picked_up"] as const));
  for (let i = 0; i < 3; i++) add(pick(shopperIds), int(1, 2), "packed");
  for (let i = 0; i < 3; i++) add(pick(shopperIds), int(0, 1), "paid");
  // drafts last: place_order cancels a shopper's older unpaid draft when they order again
  add(testCustomer.id, 0, "draft");
  add(shopperIds[3], 0, "draft");

  const catalogue = allProducts;
  const deliveredItems: { orderId: string; itemId: string; vendorId: string; customerId: string; deliveredAt: number; name: string; qty: number }[] = [];
  let created = 0;
  let skipped = 0;
  for (const [n, plan] of plans.entries()) {
    const key = uuidFrom(plan.tag);
    reseed(`order:${plan.tag}`);
    // 1-3 lines, 1-3 different boutiques
    const nLines = int(1, 3);
    const chosen = new Set<string>();
    while (chosen.size < nLines) chosen.add(pick(catalogue).id);
    const settings = { delivery: 79, threshold: 999, wrap: 49 };
    const lines = [...chosen].map((pid) => {
      const meta = productMeta.get(pid)!;
      const byGroup = new Map<string, { id: string; name: string; value: string; adj: number }[]>();
      for (const v of meta.variants) byGroup.set(v.name, [...(byGroup.get(v.name) ?? []), v]);
      const picked = [...byGroup.values()].map((opts) => pick(opts));
      const unit = round2(meta.price + picked.reduce((s, v) => s + v.adj, 0));
      const qty = rand() < 0.2 ? 2 : 1;
      const total = round2(unit * qty);
      const vendorSlug = meta.vendorSlug;
      const rate = vendorSlug === "giftping-originals" ? 0 : 10;
      const personalised = rand() < 0.4;
      const person = pick(PEOPLE);
      return {
        product_id: pid, vendor_id: vendorId.get(vendorSlug)!, variant_ids: picked.map((v) => v.id), product_name: meta.name, product_image: meta.image, variant_label: picked.length ? picked.map((v) => `${v.name}: ${v.value}`).join(", ") : null,
        personalization: personalised ? { recipientName: person.first, occasion: pick(["Birthday", "Anniversary", "Thank You"]), giftMessage: pick(["Happy birthday! Made you smile?", "With all my love.", "Thank you for everything.", "Here's to many more years together."]) } : {},
        quantity: qty, unit_price: unit, total_price: total, discount_amount: 0, gst_rate: meta.gst, gst_amount: round2((total * meta.gst) / (100 + meta.gst)), hsn_code: null,
        commission_rate: rate, commission_base: total, commission_amount: round2((total * rate) / 100), vendor_payout: round2(total - (total * rate) / 100), vendor_funded_discount: 0, platform_funded_discount: 0,
      };
    });
    const subtotal = round2(lines.reduce((s, l) => s + l.total_price, 0));
    const byVendor = new Map<string, number>();
    for (const l of lines) byVendor.set(l.vendor_id, (byVendor.get(l.vendor_id) ?? 0) + l.total_price);
    const delivery = round2([...byVendor.values()].reduce((s, v) => s + (v >= settings.threshold ? 0 : settings.delivery), 0));
    const wrap = rand() < 0.35;
    const wrapCharge = wrap ? settings.wrap : 0;
    const gst = round2(lines.reduce((s, l) => s + l.gst_amount, 0));
    const total = round2(subtotal + delivery + wrapCharge);
    const addr = addressByUser.get(plan.customer)!;
    const giftMessage = rand() < 0.4 ? pick(["Happy birthday! Hope this makes your day.", "Congratulations to you both!", "Thank you for being there.", "Thinking of you."]) : null;

    const placed = await sb.rpc("place_order", {
      p_customer_id: plan.customer,
      p_order: { idempotency_key: key, delivery_address: addr, gift_message: giftMessage, gift_wrap_selected: wrap, gift_wrap_charge: wrapCharge, subtotal, discount_amount: 0, delivery_charge: delivery, gst_amount: gst, total_amount: total } as unknown as Json,
      p_items: lines as unknown as Json,
    });
    if (placed.error) throw new Error(`place_order ${plan.tag}: ${placed.error.message}`);
    const result = placed.data as { order_id: string; order_number: string; existing?: boolean };
    if (result.existing) { skipped++; continue; }
    created++;
    const orderId = result.order_id;
    const placedAt = now - plan.daysAgo * DAY - int(0, 20) * 3_600_000 - int(1, 50) * 60_000;
    if (wrap) await sb.from("orders").update({ gift_wrap_style: pick(["green", "blush", "blue", "gold", "ivory"]) }).eq("id", orderId);

    if (plan.stage === "draft") {
      await sb.from("orders").update({ created_at: iso(placedAt) }).eq("id", orderId);
      continue;
    }

    // payment
    const rzp = `order_demo${String(n + 1).padStart(4, "0")}`;
    await sb.from("orders").update({ razorpay_order_id: rzp }).eq("id", orderId);
    const paid = await sb.rpc("confirm_order_payment", { p_razorpay_order_id: rzp, p_razorpay_payment_id: `pay_demo${String(n + 1).padStart(4, "0")}`, p_amount_paise: Math.round(total * 100), p_method: pick(["upi", "card", "netbanking", "upi", "upi"]) });
    if (paid.error) throw new Error(`confirm ${plan.tag}: ${paid.error.message}`);
    await sb.from("orders").update({ created_at: iso(placedAt), placed_at: iso(placedAt + 4 * 60_000) }).eq("id", orderId);
    await sb.from("payments").update({ created_at: iso(placedAt + 2 * 60_000), captured_at: iso(placedAt + 4 * 60_000) }).eq("order_id", orderId);
    if (plan.stage === "paid") continue;

    // each boutique accepts, then (unless just "packed") books a courier
    const items = await ok(sb.from("order_items").select("id, vendor_id, quantity, product_name").eq("order_id", orderId), "order items");
    const vendorIds = [...new Set(items.map((i) => i.vendor_id))];
    await sb.from("order_items").update({ fulfilment_status: "confirmed" }).eq("order_id", orderId);
    if (plan.stage === "packed") continue;

    for (const vid of vendorIds) {
      const awb = `DEMO${String(70000000 + n * 137 + vendorIds.indexOf(vid) * 11)}`;
      const courier = pick(COURIERS);
      const bookedAt = placedAt + int(4, 20) * 3_600_000;
      await ok(sb.from("shipments").insert({ order_id: orderId, vendor_id: vid, awb_number: awb, courier_name: courier, tracking_url: `https://www.delhivery.com/track/package/${awb}`, status: "confirmed", shiprocket_order_id: `${900000 + n}`, shiprocket_shipment_id: `${800000 + n}`, package_weight_grams: 800 }).select("id"), "shipment");
      const status = plan.stage === "delivered" ? "delivered" : plan.stage;
      const pickedAt = bookedAt + int(6, 20) * 3_600_000;
      const transitAt = pickedAt + int(8, 24) * 3_600_000;
      const ofdAt = transitAt + int(20, 40) * 3_600_000;
      const deliveredAt = ofdAt + int(3, 9) * 3_600_000;
      const events: { occurred_at: string; raw_status: string; activity: string; location: string }[] = [
        { occurred_at: iso(bookedAt), raw_status: "MANIFESTED", activity: "Shipment booked", location: "Seller" },
        { occurred_at: iso(pickedAt), raw_status: "PICKED UP", activity: "Picked up from the boutique", location: pick(SHIP_CITIES) },
      ];
      if (["in_transit", "out_for_delivery", "delivered"].includes(status)) events.push({ occurred_at: iso(transitAt), raw_status: "IN TRANSIT", activity: "Arrived at the sort centre", location: pick(SHIP_CITIES) });
      if (["out_for_delivery", "delivered"].includes(status)) events.push({ occurred_at: iso(ofdAt), raw_status: "OUT FOR DELIVERY", activity: "Out for delivery", location: addr.city });
      if (status === "delivered") events.push({ occurred_at: iso(deliveredAt), raw_status: "DELIVERED", activity: "Delivered to the recipient", location: addr.city });
      const etd = new Date(placedAt + 6 * DAY).toISOString().slice(0, 10);
      const upd = await sb.rpc("apply_shipment_update", { p_awb: awb, p_new_status: status, p_raw_status: events.at(-1)!.raw_status, p_etd: etd, p_events: events as unknown as Json });
      if (upd.error) throw new Error(`shipment ${awb}: ${upd.error.message}`);
      await sb.from("shipments").update({ created_at: iso(bookedAt), shipped_at: iso(pickedAt), delivered_at: status === "delivered" ? iso(deliveredAt) : null, last_event_at: events.at(-1)!.occurred_at }).eq("awb_number", awb);
      if (status === "delivered") for (const it of items.filter((i) => i.vendor_id === vid)) deliveredItems.push({ orderId, itemId: it.id, vendorId: vid, customerId: plan.customer, deliveredAt, name: it.product_name, qty: it.quantity });
    }
  }
  console.log(`  ${created} orders created, ${skipped} already existed`);

  // returns: one waiting for a decision (test customer, inside the window), one approved, one declined
  const { count: returnCount } = await sb.from("return_requests").select("id", { count: "exact", head: true });
  if (!returnCount) {
    const mine = deliveredItems.filter((d) => d.customerId === testCustomer.id && now - d.deliveredAt < 6 * DAY);
    const others = deliveredItems.filter((d) => d.customerId !== testCustomer.id);
    const rows = [
      mine[0] && { d: mine[0], reason: "quality", details: "The finish on the lid has a small scratch. Would like a replacement or refund.", status: "requested", note: null },
      others[0] && { d: others[0], reason: "damaged", details: "The box arrived crushed at one corner.", status: "approved", note: "Sorry about that — pickup arranged." },
      others[1] && { d: others[1], reason: "changed_mind", details: "Ordered by mistake.", status: "rejected", note: "This item was personalised, so it can't be returned for a change of mind." },
    ].filter(Boolean) as { d: (typeof deliveredItems)[number]; reason: string; details: string; status: string; note: string | null }[];
    for (const r of rows) {
      await ok(sb.from("return_requests").insert({ order_id: r.d.orderId, order_item_id: r.d.itemId, vendor_id: r.d.vendorId, customer_id: r.d.customerId, quantity: 1, reason: r.reason, details: r.details, status: r.status, decision_note: r.note, decided_at: r.status === "requested" ? null : iso(now - DAY) }).select("id"), "return request");
    }
    console.log(`  ${rows.length} return requests`);
  }

  console.log("Test customer: wishlist, diary, notifications...");
  reseed("wishlists");
  const wishSlugs = ["emerald-and-copper-celebration-hamper", "velvet-jewellery-box-pendant-set", "kuthu-vilakku-brass-lamp", "peony-rose-bouquet", "executive-watch-gift-box", "amber-glow-candle-and-diffuser-set"];
  for (const slug of wishSlugs) {
    const pid = productId.get(slug);
    if (pid) await sb.from("wishlists").upsert({ user_id: testCustomer.id, product_id: pid }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
  }
  for (const [i, uid] of shopperIds.slice(0, 6).entries()) {
    for (const p of [pick(PRODUCTS), pick(PRODUCTS)]) {
      const pid = productId.get(p.slug);
      if (pid) await sb.from("wishlists").upsert({ user_id: uid, product_id: pid }, { onConflict: "user_id,product_id", ignoreDuplicates: true });
    }
    void i;
  }

  const { count: contactCount } = await sb.from("diary_contacts").select("id", { count: "exact", head: true }).eq("user_id", testCustomer.id);
  if (!contactCount) {
    // dates are given as "days from today" + the original year, so the diary always has moments coming up this week, this month and later —
    // and a few that already passed this year (so the year view, "remembered" and the streak have something to show)
    const shiftDate = (daysFromNow: number, year: number) => {
      const d = new Date(now + daysFromNow * DAY);
      return `${year}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
    };
    type Ev = { type: string; title: string | null; off: number; year: number; once?: boolean };
    const people: { name: string; rel: string; tagline: string | null; interests: string[]; prefs: string; budget: number; fav: boolean; notes: string | null; events: Ev[] }[] = [
      { name: "Mom", rel: "Mother", tagline: "Always makes everyone feel special", interests: ["jasmine flowers", "sarees", "filter coffee", "gardening"], prefs: "Loves anything floral or brass. Allergic to strong perfume.", budget: 3000, fav: true, notes: "She said she liked the jasmine candle at Nani's. Also mentioned she wants a lightweight silk saree in pastel shades. Maybe plan something with a handwritten note this time.",
        events: [{ type: "birthday", title: null, off: 9, year: 1966 }, { type: "anniversary", title: "Wedding anniversary", off: 47, year: 1990 }, { type: "festival", title: "Diwali", off: 45, year: 2020 }, { type: "other", title: "Mother's Day", off: -137, year: 2020 }] },
      { name: "Dad", rel: "Father", tagline: "Fixes everything with a smile", interests: ["cricket", "history books", "watches"], prefs: "Prefers practical gifts. Wears size 42 shirts.", budget: 4000, fav: true, notes: null,
        events: [{ type: "birthday", title: null, off: 33, year: 1962 }, { type: "other", title: "Father's Day", off: -95, year: 2020 }] },
      { name: "Riya", rel: "Sister", tagline: "My partner in every plan", interests: ["skincare", "jewellery", "baking"], prefs: "Blush and gold, nothing too loud.", budget: 2500, fav: true, notes: "Wants to start a baking side-hustle — gift her something for the kitchen next time.",
        events: [{ type: "birthday", title: null, off: 2, year: 1998 }, { type: "graduation", title: "MBA convocation", off: 60, year: 2026, once: true }, { type: "festival", title: "Raksha Bandhan", off: -27, year: 2020 }] },
      { name: "Arnav", rel: "Friend", tagline: "Always up for a road trip", interests: ["coffee", "sneakers", "travel"], prefs: "Anything he can use on a trip.", budget: 2000, fav: false, notes: null, events: [{ type: "birthday", title: null, off: 18, year: 1995 }] },
      { name: "Kavya", rel: "Colleague", tagline: null, interests: ["stationery", "plants"], prefs: "Minimal, desk-friendly gifts.", budget: 1500, fav: false, notes: null,
        events: [{ type: "birthday", title: null, off: 11, year: 1992 }, { type: "thank-you", title: "Thanks for covering my leave", off: 25, year: 2026, once: true }] },
      { name: "Nani", rel: "Grandparent", tagline: "Blesses every gift before she opens it", interests: ["devotional music", "sweets", "embroidery"], prefs: "Silk, brass and mithai. Sugar-free where possible.", budget: 3500, fav: true, notes: null, events: [{ type: "birthday", title: "85th birthday", off: 8, year: 1941 }] },
      { name: "Maya & Kunal", rel: "Friend", tagline: null, interests: ["home decor", "wine"], prefs: "Just moved into a new flat.", budget: 3000, fav: false, notes: null, events: [{ type: "housewarming", title: "Housewarming", off: 14, year: 2026, once: true }, { type: "anniversary", title: "Anniversary", off: 88, year: 2019 }] },
      { name: "Aditi", rel: "Other", tagline: null, interests: ["dance", "handbags"], prefs: "Wedding in March — trousseau ideas welcome.", budget: 6000, fav: false, notes: null, events: [{ type: "wedding", title: "Aditi's wedding", off: 75, year: 2026, once: true }] },
    ];
    const createdAt = iso(now - 400 * DAY); // the diary has been kept for a while, so earlier moments this year count as moments it could have remembered
    for (const p of people) {
      const c = await ok(sb.from("diary_contacts").insert({ user_id: testCustomer.id, name: p.name, relationship: p.rel, tagline: p.tagline, interests: p.interests, gift_preferences: p.prefs, budget_max: p.budget, is_favorite: p.fav, notes: p.notes, created_at: createdAt }).select("id").single(), "diary contact");
      for (const e of p.events) {
        await ok(sb.from("diary_events").insert({ user_id: testCustomer.id, contact_id: c.id, event_type: e.type, title: e.title, event_date: shiftDate(e.off, e.year), is_recurring: !e.once, reminder_days: [7, 3], reminder_days_before: 7, is_active: true, notes: null, created_at: createdAt }).select("id"), "diary event");
      }
    }
    const { data: contacts } = await sb.from("diary_contacts").select("id, name").eq("user_id", testCustomer.id);
    const cid = (name: string) => contacts?.find((c) => c.name === name || c.name.startsWith(name))?.id ?? null;
    // what has been given before, with what they said — each sits inside the "gift sorted" window of a moment, so "last year you gave…" and the timeline have a story
    const gifts: { c: string; name: string; type: string; amount: number; ago: number; notes: string | null; slug?: string }[] = [
      { c: "Mom", name: "Kuthu Vilakku Brass Lamp", type: "birthday", amount: 2299, ago: 352, notes: "She loved this! Still keeps it in the puja room.", slug: "kuthu-vilakku-brass-lamp" },
      { c: "Mom", name: "Handwoven silk scarf", type: "birthday", amount: 1899, ago: 717, notes: "Her favourite colour. Wore it during last Diwali." },
      { c: "Mom", name: "Wellness hamper", type: "birthday", amount: 2499, ago: 1082, notes: "She really enjoyed the teas and candles. Said it was so thoughtful." },
      { c: "Mom", name: "Peony Rose Bouquet", type: "other", amount: 1499, ago: 140, notes: "Delivered on Mother's Day morning.", slug: "peony-rose-bouquet" },
      { c: "Dad", name: "Leather Wallet", type: "birthday", amount: 2199, ago: 335, notes: "He carries it everywhere now." },
      { c: "Dad", name: "Executive Watch Gift Box", type: "other", amount: 3999, ago: 100, notes: "For Father's Day — he wore it that evening.", slug: "executive-watch-gift-box" },
      { c: "Riya", name: "Rose Gold Celebration Gift Box", type: "birthday", amount: 1799, ago: 362, notes: "She loved the candle." },
      { c: "Riya", name: "Silver jhumkas", type: "festival", amount: 1299, ago: 30, notes: "Tied her rakhi and gave these back." },
      { c: "Arnav", name: "Leather Journal & Pen Set", type: "birthday", amount: 1799, ago: 348, notes: null },
      { c: "Kavya", name: "Blank Leather Diary", type: "birthday", amount: 999, ago: 354, notes: null },
      { c: "Nani", name: "Silk shawl", type: "birthday", amount: 2799, ago: 357, notes: "She blessed it before wearing it." },
      { c: "Maya", name: "Dried Flower Vase & Candle Set", type: "housewarming", amount: 1699, ago: 20, notes: "Before the party." },
    ];
    for (const g of gifts) await ok(sb.from("gift_history").insert({ user_id: testCustomer.id, contact_id: cid(g.c), gift_name: g.name, product_id: g.slug ? productId.get(g.slug) ?? null : null, event_type: g.type, amount: g.amount, gifted_at: iso(now - g.ago * DAY), notes: g.notes }).select("id"), "gift history");

    // gift plans: one chosen, one wrapped, one an order that has really been placed (so the tracker shows "Ordered" with a link)
    const { data: evs } = await sb.from("diary_events").select("id, contact_id, event_type, event_date, is_recurring, title").eq("user_id", testCustomer.id);
    const nextOcc = (e: { event_date: string; is_recurring: boolean }) => {
      const today = new Date(now).toISOString().slice(0, 10);
      const [, m, d] = e.event_date.split("-");
      const y = Number(today.slice(0, 4));
      const thisYear = `${y}-${m}-${d}`;
      return e.is_recurring ? (thisYear >= today ? thisYear : `${y + 1}-${m}-${d}`) : e.event_date;
    };
    const birthdayOf = (name: string) => evs?.find((e) => e.contact_id === cid(name) && e.event_type === "birthday");
    const { data: paidLines } = await sb.from("order_items").select("product_id, order:orders!inner(customer_id, status)").eq("order.customer_id", testCustomer.id).not("order.status", "in", "(created,payment_initiated,cancelled)").limit(1);
    const orderedProduct = paidLines?.[0]?.product_id ?? null;
    const plans = [
      { who: "Mom", slug: "amber-glow-candle-and-diffuser-set", note: "She loves the scent", status: "chosen", product: null as string | null, made: 3 },
      { who: "Riya", slug: "velvet-jewellery-box-pendant-set", note: "Matches the gold she wears", status: "wrapped", product: null as string | null, made: 10 },
      { who: "Dad", slug: "", note: "A watch strap to go with the box he already has", status: "chosen", product: orderedProduct, made: 25 },
    ];
    for (const pl of plans) {
      const ev = birthdayOf(pl.who);
      if (!ev) continue;
      const product = pl.product ?? (pl.slug ? productId.get(pl.slug) ?? null : null);
      await ok(sb.from("diary_gift_plans").insert({ user_id: testCustomer.id, contact_id: ev.contact_id, event_id: ev.id, occasion_date: nextOcc(ev), product_id: product, gift_name: null, note: pl.note, status: pl.status, created_at: iso(now - pl.made * DAY) }).select("id"), "gift plan");
    }
  }

  const { count: notifCount } = await sb.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", testCustomer.id);
  if (!notifCount) {
    const orders = await ok(sb.from("orders").select("id, order_number, status").eq("customer_id", testCustomer.id).order("created_at", { ascending: false }), "test customer orders");
    const o = (i: number) => orders[i] ?? orders[0];
    const rows = [
      { type: "diary_reminder", title: "Riya's birthday is in 2 days", message: "Tap to see gift ideas picked for them.", link_url: "/diary", read: false, ago: 0.1, meta: { event_type: "birthday" } },
      { type: "diary_reminder", title: "Nani's 85th birthday is in 8 days", message: "Tap to see gift ideas picked for them.", link_url: "/diary", read: false, ago: 0.3, meta: { event_type: "birthday" } },
      { type: "diary_reminder", title: "Mom's birthday is in 9 days", message: "Tap to see gift ideas picked for them.", link_url: "/diary", read: false, ago: 0.35, meta: { event_type: "birthday" } },
      { type: "shipment_update", title: "Your gift is on its way", message: `Part of order ${o(0).order_number} is with the courier.`, link_url: `/orders/${o(0).id}`, read: false, ago: 1 },
      { type: "order_confirmed", title: "Order confirmed", message: `Thank you — order ${o(1).order_number} is confirmed and the boutiques are preparing it.`, link_url: `/orders/${o(1).id}`, read: true, ago: 2 },
      { type: "order_delivered", title: "Delivered", message: `Your order ${o(2).order_number} has arrived. We hope it brings a smile.`, link_url: `/orders/${o(2).id}`, read: true, ago: 3 },
      { type: "system", title: "Welcome to GiftPing", message: "Add the people you love to your Gifting Diary and we'll remind you before every special day.", link_url: "/diary", read: true, ago: 30 },
    ];
    for (const r of rows) await ok(sb.from("notifications").insert({ user_id: testCustomer.id, type: r.type, title: r.title, message: r.message, link_url: r.link_url, is_read: r.read, created_at: iso(now - r.ago * DAY), ...("meta" in r ? { metadata: r.meta } : {}) }).select("id"), "notification");
  }

  const [pc, oc, uc, rc] = await Promise.all([
    sb.from("products").select("id", { count: "exact", head: true }),
    sb.from("orders").select("id", { count: "exact", head: true }),
    sb.from("users").select("id", { count: "exact", head: true }),
    sb.from("reviews").select("id", { count: "exact", head: true }),
  ]);
  console.log(`\nDone. Catalogue: ${pc.count} products · ${oc.count} orders · ${uc.count} accounts · ${rc.count} reviews.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

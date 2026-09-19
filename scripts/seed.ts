/**
 * Idempotent dev seed: categories, two vendors (in-house + one partner, to exercise vendor
 * attribution/filtering), a handful of products with variants/images/reviews, so Stage 3's
 * catalog pages have real, varied data to render. Safe to re-run — every insert is keyed on a
 * stable slug/natural key via upsert.
 *
 * Product photography: two products reuse a real product photo cropped from the client's own
 * approved ui-references (public/seed-images/hamper.webp) — everything else deliberately has
 * no thumbnail_url, rendering the branded placeholder (components/shop/ProductImage.tsx) until
 * Stage 4 lets vendors upload real photos. Not filling in fake stock photography for the rest.
 *
 * Run with: npm run seed
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const HAMPER_IMAGE = "/seed-images/hamper.webp";

// Every row sets every key explicitly (even ones equal to the column default): a batched
// .upsert() sends one INSERT with a fixed column list, so a row that omits a key present on
// a sibling row gets NULL substituted for it, not the table's DEFAULT.
const CATEGORIES = [
  { name: "Birthday", slug: "birthday", theme_color: "#C9A84C", sort_order: 1, is_featured: true },
  { name: "Anniversary", slug: "anniversary", theme_color: "#1A4731", sort_order: 2, is_featured: true },
  { name: "Wedding", slug: "wedding", theme_color: "#C9A84C", sort_order: 3, is_featured: true },
  { name: "Corporate Gifting", slug: "corporate-gifting", theme_color: "#1A4731", sort_order: 4, is_featured: false },
  { name: "For Her", slug: "for-her", theme_color: "#C9A84C", sort_order: 5, is_featured: false },
  { name: "For Him", slug: "for-him", theme_color: "#1A4731", sort_order: 6, is_featured: false },
] as const;

const VENDORS = [
  {
    slug: "giftping-originals",
    business_name: "GiftPing Originals",
    description: "GiftPing's own in-house gifting collection.",
    short_description: "Curated by the GiftPing team.",
    commissionOverride: 0, // in-house: explicit 0% (an override of 0 is real, not "unset")
    is_in_house: true,
  },
  {
    slug: "aurelia-gifts",
    business_name: "Aurelia Gifts",
    description: "Aurelia brings you a curated collection of luxurious gifts crafted with love, elegance and attention to every little detail.",
    short_description: "Timeless Elegance. Thoughtful Gifting.",
    commissionOverride: null, // partner: no override -> category/platform default applies
    is_in_house: false,
  },
] as const;

const PRODUCTS = [
  {
    slug: "luxe-memory-hamper",
    name: "Luxe Memory Hamper",
    short_description: "Thoughtfully curated for your most special people.",
    description: "A beautifully curated hamper designed to make every occasion extra special.",
    base_price: 3499,
    sale_price: 2999,
    vendorSlug: "giftping-originals",
    categorySlug: "birthday",
    occasion_tags: ["birthday", "anniversary", "thank-you"],
    recipient_tags: ["for-her", "for-him"],
    tags: ["hamper", "premium", "gift-wrapped"],
    thumbnail_url: HAMPER_IMAGE,
    variants: [
      { name: "Wrapping Style", value: "Classic Green", price_adjustment: 0 },
      { name: "Wrapping Style", value: "Blush Pink", price_adjustment: 0 },
      { name: "Wrapping Style", value: "Royal Blue", price_adjustment: 0 },
      { name: "Wrapping Style", value: "Premium Gold", price_adjustment: 150 },
    ],
  },
  {
    slug: "personalised-name-plate",
    name: "Personalised Name Plate",
    short_description: "Make it uniquely theirs.",
    description: "An engraved name plate personalised with a name or message of your choice.",
    base_price: 1299,
    vendorSlug: "giftping-originals",
    categorySlug: "corporate-gifting",
    occasion_tags: ["housewarming", "thank-you"],
    recipient_tags: ["for-parents", "for-colleagues"],
    tags: ["personalised", "engraved"],
    thumbnail_url: null,
    variants: [],
  },
  {
    slug: "premium-gift-hamper",
    name: "Premium Gift Hamper",
    short_description: "Make it a celebration.",
    description: "An assortment of premium treats and keepsakes in a signature GiftPing box.",
    base_price: 2499,
    vendorSlug: "giftping-originals",
    categorySlug: "anniversary",
    occasion_tags: ["anniversary", "wedding"],
    recipient_tags: ["for-her", "for-him"],
    tags: ["hamper", "premium"],
    thumbnail_url: HAMPER_IMAGE,
    variants: [],
  },
  {
    slug: "mens-wallet-gift-set",
    name: "Men's Wallet Gift Set",
    short_description: "Timeless picks he'll love.",
    description: "A genuine leather wallet paired with a matching keychain, gift-boxed.",
    base_price: 1899,
    vendorSlug: "giftping-originals",
    categorySlug: "for-him",
    occasion_tags: ["birthday", "anniversary"],
    recipient_tags: ["for-him"],
    tags: ["leather", "accessories"],
    thumbnail_url: null,
    variants: [],
  },
  {
    slug: "vintage-luxe-perfume",
    name: "Vintage Luxe Perfume",
    short_description: "Classic gifts with a touch of timeless luxury.",
    description: "A signature Aurelia fragrance, bottled in a keepsake glass decanter.",
    base_price: 4299,
    vendorSlug: "aurelia-gifts",
    categorySlug: "for-her",
    occasion_tags: ["anniversary", "wedding"],
    recipient_tags: ["for-her"],
    tags: ["perfume", "luxury"],
    thumbnail_url: null,
    variants: [],
  },
  {
    slug: "signature-elegance-handbag",
    name: "Signature Elegance Handbag",
    short_description: "Sophisticated picks for the ones you adore.",
    description: "A structured leather handbag from Aurelia's Signature Elegance collection.",
    base_price: 6999,
    vendorSlug: "aurelia-gifts",
    categorySlug: "wedding",
    occasion_tags: ["wedding", "anniversary"],
    recipient_tags: ["for-her"],
    tags: ["handbag", "leather", "luxury"],
    thumbnail_url: null,
    variants: [],
  },
] as const;

const REVIEWS = [
  {
    productSlug: "luxe-memory-hamper",
    rating: 5,
    title: "Absolutely beautiful",
    body: "The packaging alone made it feel so special. My sister loved every single item inside.",
  },
  {
    productSlug: "luxe-memory-hamper",
    rating: 4,
    title: "Great quality, slightly pricey",
    body: "Everything felt premium and well put together. Delivery was right on time.",
  },
] as const;

async function main() {
  console.log("Seeding categories...");
  const { data: categories, error: categoryError } = await supabase
    .from("categories")
    .upsert([...CATEGORIES], { onConflict: "slug" })
    .select("id, slug");
  if (categoryError) throw categoryError;
  const categoryBySlug = new Map(categories!.map((c) => [c.slug, c.id]));

  console.log("Seeding vendors...");
  const vendorBySlug = new Map<string, string>();
  for (const vendor of VENDORS) {
    const { data, error } = await supabase
      .from("vendors")
      .upsert(
        {
          business_name: vendor.business_name,
          slug: vendor.slug,
          description: vendor.description,
          short_description: vendor.short_description,
          status: "approved",
          is_featured: !vendor.is_in_house,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    vendorBySlug.set(vendor.slug, data!.id);

    const { error: privateError } = await supabase
      .from("vendor_private")
      .upsert({ vendor_id: data!.id, commission_rate: vendor.commissionOverride }, { onConflict: "vendor_id" });
    if (privateError) throw privateError;
  }

  console.log("Seeding products, variants, and images...");
  const productIdBySlug = new Map<string, string>();
  for (const product of PRODUCTS) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    const vendorId = vendorBySlug.get(product.vendorSlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${product.categorySlug}`);
    if (!vendorId) throw new Error(`Unknown vendor slug: ${product.vendorSlug}`);

    const { data, error } = await supabase
      .from("products")
      .upsert(
        {
          vendor_id: vendorId,
          category_id: categoryId,
          name: product.name,
          slug: product.slug,
          short_description: product.short_description,
          description: product.description,
          base_price: product.base_price,
          sale_price: "sale_price" in product ? product.sale_price : null,
          occasion_tags: [...product.occasion_tags],
          recipient_tags: [...product.recipient_tags],
          tags: [...product.tags],
          thumbnail_url: product.thumbnail_url,
          is_in_house: product.vendorSlug === "giftping-originals",
          status: "active",
          stock_quantity: 50,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "slug" },
      )
      .select("id")
      .single();
    if (error) throw error;
    productIdBySlug.set(product.slug, data!.id);

    if (product.thumbnail_url) {
      await supabase.from("product_images").delete().eq("product_id", data!.id);
      const { error: imageError } = await supabase.from("product_images").insert({
        product_id: data!.id,
        url: product.thumbnail_url,
        alt_text: product.name,
        sort_order: 0,
        is_primary: true,
      });
      if (imageError) throw imageError;
    }

    if (product.variants.length > 0) {
      await supabase.from("product_variants").delete().eq("product_id", data!.id);
      const { error: variantError } = await supabase.from("product_variants").insert(
        product.variants.map((v) => ({
          product_id: data!.id,
          name: v.name,
          value: v.value,
          price_adjustment: v.price_adjustment,
          stock_quantity: 20,
        })),
      );
      if (variantError) throw variantError;
    }
  }

  console.log("Seeding reviews (if the Stage 2 test customer exists)...");
  const { data: testCustomer } = await supabase
    .from("users")
    .select("id")
    .eq("email", "test-customer@giftping.test")
    .maybeSingle();

  if (testCustomer) {
    for (const review of REVIEWS) {
      const productId = productIdBySlug.get(review.productSlug);
      if (!productId) continue;

      const { data: existing } = await supabase
        .from("reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", testCustomer.id)
        .eq("title", review.title)
        .maybeSingle();

      if (existing) continue;

      const { error: reviewError } = await supabase.from("reviews").insert({
        product_id: productId,
        user_id: testCustomer.id,
        rating: review.rating,
        title: review.title,
        body: review.body,
      });
      if (reviewError) throw reviewError;
    }
  } else {
    console.log("  (skipped — run the Stage 2 test-account setup first if you want sample reviews)");
  }

  console.log(
    `Done: ${CATEGORIES.length} categories, ${VENDORS.length} vendors, ${PRODUCTS.length} products.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

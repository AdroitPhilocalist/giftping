/**
 * Idempotent dev seed: a handful of categories, the in-house "GiftPing Originals" vendor,
 * and a few sample products under it, so Stage 3's catalog pages have something to render.
 * Safe to re-run — every insert is keyed on a stable slug via upsert.
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

const PRODUCTS = [
  {
    slug: "luxe-memory-hamper",
    name: "Luxe Memory Hamper",
    short_description: "Thoughtfully curated for your most special people.",
    description: "A beautifully curated hamper designed to make every occasion extra special.",
    base_price: 3499,
    sale_price: 2999,
    categorySlug: "birthday",
    occasion_tags: ["birthday", "anniversary", "thank-you"],
    recipient_tags: ["for-her", "for-him"],
    tags: ["hamper", "premium", "gift-wrapped"],
  },
  {
    slug: "personalised-name-plate",
    name: "Personalised Name Plate",
    short_description: "Make it uniquely theirs.",
    description: "An engraved name plate personalised with a name or message of your choice.",
    base_price: 1299,
    categorySlug: "corporate-gifting",
    occasion_tags: ["housewarming", "thank-you"],
    recipient_tags: ["for-parents", "for-colleagues"],
    tags: ["personalised", "engraved"],
  },
  {
    slug: "premium-gift-hamper",
    name: "Premium Gift Hamper",
    short_description: "Make it a celebration.",
    description: "An assortment of premium treats and keepsakes in a signature GiftPing box.",
    base_price: 2499,
    categorySlug: "anniversary",
    occasion_tags: ["anniversary", "wedding"],
    recipient_tags: ["for-her", "for-him"],
    tags: ["hamper", "premium"],
  },
  {
    slug: "mens-wallet-gift-set",
    name: "Men's Wallet Gift Set",
    short_description: "Timeless picks he'll love.",
    description: "A genuine leather wallet paired with a matching keychain, gift-boxed.",
    base_price: 1899,
    categorySlug: "for-him",
    occasion_tags: ["birthday", "anniversary"],
    recipient_tags: ["for-him"],
    tags: ["leather", "accessories"],
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

  console.log("Seeding in-house vendor (GiftPing Originals)...");
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .upsert(
      {
        business_name: "GiftPing Originals",
        slug: "giftping-originals",
        description: "GiftPing's own in-house gifting collection.",
        status: "approved",
        commission_rate: 0,
        approved_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (vendorError) throw vendorError;

  console.log("Seeding products...");
  for (const product of PRODUCTS) {
    const categoryId = categoryBySlug.get(product.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${product.categorySlug}`);

    const { error: productError } = await supabase.from("products").upsert(
      {
        vendor_id: vendor!.id,
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
        is_in_house: true,
        status: "active",
        stock_quantity: 50,
        approved_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );

    if (productError) throw productError;
  }

  console.log(`Done: ${CATEGORIES.length} categories, 1 vendor, ${PRODUCTS.length} products.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

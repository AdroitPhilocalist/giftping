/**
 * Loads the built-in product taxonomy (lib/catalog/taxonomy.ts) into whichever database .env.local points at: ~25 product types, their subcategories, and
 * the category-specific attributes vendors fill in. This is the one-time setup a client runs on a fresh install — it is NOT demo data.
 *
 *   npm run seed:taxonomy               add whatever is missing; never touches a row that already exists (safe to run again any time)
 *   npm run seed:taxonomy -- --overwrite  also bring existing rows in line with the file (names, order, parents, attribute options); never deletes
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/db/types";
import { flattenTaxonomy } from "../lib/catalog/taxonomy";
import { seedTaxonomy } from "./lib/taxonomy-seeder";

config({ path: ".env.local" });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local");

async function main() {
  const overwrite = process.argv.includes("--overwrite");
  const { types, attributes } = flattenTaxonomy();
  console.log(`Database: ${new URL(url!).host}`);
  console.log(`Taxonomy: ${types.length} types (${types.filter((t) => t.depth === 0).length} top-level), ${attributes.length} attributes — mode: ${overwrite ? "OVERWRITE existing rows" : "add missing only"}`);

  const sb = createClient<Database>(url!, key!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { added } = await seedTaxonomy(sb, { overwrite });
  console.log(`Done. Added ${added.types} product types and ${added.attributes} attributes.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

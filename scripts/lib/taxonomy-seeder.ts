import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../lib/db/types";
import { flattenTaxonomy } from "../../lib/catalog/taxonomy";

type Sb = SupabaseClient<Database>;

export interface SeedTaxonomyResult {
  typeIdBySlug: Map<string, string>;
  /** the attribute a product of `typeSlug` is asked for under `key` — its own, or one inherited from an ancestor type */
  resolveAttributeId: (typeSlug: string, key: string) => string | undefined;
  added: { types: number; attributes: number };
}

function fail(step: string, error: { message: string } | null): never {
  throw new Error(`taxonomy seed — ${step}: ${error?.message ?? "no data returned"}`);
}

const chunk = <T,>(rows: T[], size: number) => Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, i * size + size));

/**
 * Writes lib/catalog/taxonomy.ts into the database. By default it ONLY ADDS what is missing (matched by slug / by type+key) and never touches a row that
 * exists — so running it again after the client has renamed, hidden or reordered things changes none of their work. `overwrite` brings the rows the file
 * defines back in line with it (names, descriptions, order, parents, attribute labels and options) but still never changes is_active or SEO text, and never
 * deletes anything.
 */
export async function seedTaxonomy(sb: Sb, opts: { overwrite?: boolean } = {}): Promise<SeedTaxonomyResult> {
  const overwrite = opts.overwrite ?? false;
  const { types, attributes } = flattenTaxonomy();

  const { data: before, error: beforeError } = await sb.from("product_types").select("id, slug");
  if (beforeError) fail("reading product_types", beforeError);
  const typeIdBySlug = new Map((before ?? []).map((t) => [t.slug, t.id]));
  const typesBefore = typeIdBySlug.size;

  // A level at a time, so a child's parent_id already exists when the child is written.
  const maxDepth = Math.max(...types.map((t) => t.depth));
  for (let depth = 0; depth <= maxDepth; depth++) {
    const level = types.filter((t) => t.depth === depth);
    // Rows with and without a description go in separate upserts: PostgREST fills a key missing from some rows with NULL, which would blank a description
    // the client had written for a type this file doesn't describe.
    for (const withDescription of [true, false]) {
      const rows = level
        .filter((t) => (t.description !== null) === withDescription)
        .map((t) => ({
          name: t.name,
          slug: t.slug,
          sort_order: t.sortOrder,
          parent_id: t.parentSlug ? (typeIdBySlug.get(t.parentSlug) ?? null) : null,
          ...(withDescription ? { description: t.description } : {}),
        }));
      for (const part of chunk(rows, 100)) {
        const { data, error } = await sb.from("product_types").upsert(part, { onConflict: "slug", ignoreDuplicates: !overwrite }).select("id, slug");
        if (error) fail(`writing product_types (depth ${depth})`, error);
        for (const row of data ?? []) typeIdBySlug.set(row.slug, row.id);
      }
    }
  }

  const { data: attrsBefore, error: attrsBeforeError } = await sb.from("product_attributes").select("id");
  if (attrsBeforeError) fail("reading product_attributes", attrsBeforeError);
  const attributesBefore = attrsBefore?.length ?? 0;

  const attributeRows = attributes.map((a) => {
    const productTypeId = typeIdBySlug.get(a.typeSlug);
    if (!productTypeId) throw new Error(`taxonomy seed — attribute ${a.key} belongs to unknown type ${a.typeSlug}`);
    return { product_type_id: productTypeId, key: a.key, label: a.label, input_type: a.inputType, options: a.options, sort_order: a.sortOrder };
  });
  for (const part of chunk(attributeRows, 100)) {
    const { error } = await sb.from("product_attributes").upsert(part, { onConflict: "product_type_id,key", ignoreDuplicates: !overwrite });
    if (error) fail("writing product_attributes", error);
  }

  const { data: allTypes, error: allTypesError } = await sb.from("product_types").select("id, slug");
  if (allTypesError) fail("re-reading product_types", allTypesError);
  const slugByTypeId = new Map((allTypes ?? []).map((t) => [t.id, t.slug]));
  const { data: allAttributes, error: allAttributesError } = await sb.from("product_attributes").select("id, key, product_type_id");
  if (allAttributesError) fail("re-reading product_attributes", allAttributesError);
  const attributeId = new Map((allAttributes ?? []).map((a) => [`${slugByTypeId.get(a.product_type_id)}:${a.key}`, a.id]));

  const parentSlug = new Map<string, string | null>(types.map((t) => [t.slug, t.parentSlug]));
  const resolveAttributeId = (typeSlug: string, key: string) => {
    for (let cursor: string | null = typeSlug, hops = 0; cursor && hops < 10; cursor = parentSlug.get(cursor) ?? null, hops++) {
      const found = attributeId.get(`${cursor}:${key}`);
      if (found) return found;
    }
    return undefined;
  };

  return {
    typeIdBySlug: new Map((allTypes ?? []).map((t) => [t.slug, t.id])),
    resolveAttributeId,
    added: { types: (allTypes?.length ?? 0) - typesBefore, attributes: (allAttributes?.length ?? 0) - attributesBefore },
  };
}

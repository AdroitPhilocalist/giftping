/** Pure tree helpers over the product_types table (parent_id self-reference) — shared by the admin tree
 * editor, the vendor product form's type picker, and the shop's browsing pages/breadcrumbs. No DB access
 * here; callers pass in whatever flat row list they already fetched.
 */
export interface ProductTypeRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductTypeTreeNode extends ProductTypeRow {
  /** 0 for a top-level type, 1 for its direct children, and so on. */
  depth: number;
}

function groupByParent<T extends { id: string; parent_id: string | null }>(rows: T[]): Map<string | null, T[]> {
  const byParent = new Map<string | null, T[]>();
  for (const row of rows) {
    const list = byParent.get(row.parent_id) ?? [];
    list.push(row);
    byParent.set(row.parent_id, list);
  }
  return byParent;
}

/** Flattens the tree into a depth-first, indentable order (a node's children always immediately follow it),
 * each level sorted by sort_order then name. Good for a simple indented admin list — no drag-and-drop
 * tree-editor precedent exists in this codebase, and this is proportionate to a taxonomy of a few dozen
 * nodes. */
export function flattenProductTypeTree(rows: ProductTypeRow[]): ProductTypeTreeNode[] {
  const byParent = groupByParent(rows);
  for (const list of byParent.values()) list.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const out: ProductTypeTreeNode[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const row of byParent.get(parentId) ?? []) {
      out.push({ ...row, depth });
      visit(row.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}

/** Every id reachable from `rootId` by following parent_id downward (children, grandchildren, ...) — never
 * includes `rootId` itself. Used to keep a parent-picker from offering a node's own descendant as its new
 * parent (which would create a cycle). */
export function descendantIds(rows: ProductTypeRow[], rootId: string): Set<string> {
  const byParent = groupByParent(rows);
  const out = new Set<string>();
  const walk = (id: string) => {
    for (const child of byParent.get(id) ?? []) {
      if (!out.has(child.id)) {
        out.add(child.id);
        walk(child.id);
      }
    }
  };
  walk(rootId);
  return out;
}

/** The full chain from the tree's root down to (and including) `id` — e.g. [Jewellery, Necklaces]. Used for
 * breadcrumbs and for collecting a type's "effective" attribute set (its own attributes union every
 * ancestor's). Defensively stops on a cycle rather than looping forever if the data is ever corrupt. */
export function ancestorChain(rows: ProductTypeRow[], id: string): ProductTypeRow[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const chain: ProductTypeRow[] = [];
  let cursor: string | null = id;
  const seen = new Set<string>();
  while (cursor) {
    const row = byId.get(cursor);
    if (!row || seen.has(cursor)) break;
    seen.add(cursor);
    chain.unshift(row);
    cursor = row.parent_id;
  }
  return chain;
}

/**
 * Read every row of a query, one page at a time.
 *
 * PostgREST silently clamps a response to the project's max-rows setting (1,000 by default) — a bigger `.limit()`
 * is accepted and then ignored, with no error and no "truncated" signal, so a total computed from it just comes out
 * low. Paging with `.range()` is the only way to get past it.
 *
 * The caller's query MUST have a total, stable `.order()` (put a unique column like `id` last) or rows that share a
 * sort value can be skipped or repeated across pages.
 *
 * `maxRows` is a hard ceiling. We always ask for one row beyond it, so `truncated` is exact: true only if more
 * rows really exist than were returned (never a false alarm at exactly `maxRows`).
 */
export interface PageResult<T> {
  data: T[] | null;
  error: unknown;
}

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  opts: { maxRows: number; pageSize?: number },
): Promise<{ rows: T[]; truncated: boolean }> {
  const pageSize = opts.pageSize ?? 1000;
  const rows: T[] = [];
  while (rows.length <= opts.maxRows) {
    const from = rows.length;
    // never ask past maxRows + 1 (the +1 is the probe that proves there is more)
    const to = Math.min(from + pageSize - 1, opts.maxRows);
    const { data, error } = await page(from, to);
    if (error) throw error;
    const got = data ?? [];
    rows.push(...got);
    if (got.length < to - from + 1) return { rows, truncated: false };
  }
  return { rows: rows.slice(0, opts.maxRows), truncated: true };
}

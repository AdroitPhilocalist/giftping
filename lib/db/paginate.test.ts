import { describe, expect, it } from "vitest";
import { fetchAllRows } from "./paginate";

/** A fake table that, like PostgREST, never returns more than `serverMax` rows per request however many are asked for. */
function fakeTable(total: number, serverMax = 1000) {
  const calls: [number, number][] = [];
  const page = async (from: number, to: number) => {
    calls.push([from, to]);
    const end = Math.min(to, from + serverMax - 1, total - 1);
    return { data: from > end ? [] : Array.from({ length: end - from + 1 }, (_, i) => from + i), error: null };
  };
  return { page, calls };
}

describe("fetchAllRows", () => {
  it("gets everything past the server's own row clamp", async () => {
    const t = fakeTable(2500);
    const { rows, truncated } = await fetchAllRows(t.page, { maxRows: 50000 });
    expect(rows).toHaveLength(2500);
    expect(rows[0]).toBe(0);
    expect(rows.at(-1)).toBe(2499);
    expect(new Set(rows).size).toBe(2500); // nothing skipped or repeated
    expect(truncated).toBe(false);
  });

  it("handles an empty table and a short table", async () => {
    expect((await fetchAllRows(fakeTable(0).page, { maxRows: 100 })).rows).toEqual([]);
    expect((await fetchAllRows(fakeTable(7).page, { maxRows: 100 })).rows).toHaveLength(7);
  });

  it("handles a row count that is an exact multiple of the page size", async () => {
    const { rows, truncated } = await fetchAllRows(fakeTable(30).page, { maxRows: 1000, pageSize: 10 });
    expect(rows).toHaveLength(30);
    expect(truncated).toBe(false);
  });

  it("is NOT truncated when the table has exactly maxRows rows", async () => {
    const { rows, truncated } = await fetchAllRows(fakeTable(100).page, { maxRows: 100, pageSize: 40 });
    expect(rows).toHaveLength(100);
    expect(truncated).toBe(false);
  });

  it("truncates at maxRows and says so when more rows exist", async () => {
    const { rows, truncated } = await fetchAllRows(fakeTable(101).page, { maxRows: 100, pageSize: 40 });
    expect(rows).toHaveLength(100);
    expect(truncated).toBe(true);
  });

  it("never asks the server for a window beyond maxRows + 1", async () => {
    const t = fakeTable(5000);
    await fetchAllRows(t.page, { maxRows: 2000 });
    expect(Math.max(...t.calls.map(([, to]) => to))).toBe(2000);
  });

  it("propagates a query error instead of returning partial data", async () => {
    let n = 0;
    await expect(
      fetchAllRows(async () => (++n === 2 ? { data: null, error: new Error("boom") } : { data: Array(10).fill(0), error: null }), { maxRows: 100, pageSize: 10 }),
    ).rejects.toThrow("boom");
  });
});

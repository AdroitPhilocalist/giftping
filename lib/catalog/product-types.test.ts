import { describe, expect, it } from "vitest";
import { ancestorChain, descendantIds, flattenProductTypeTree, type ProductTypeRow } from "./product-types";

const row = (id: string, parent_id: string | null, name: string, sort_order = 0): ProductTypeRow => ({ id, parent_id, name, slug: id, sort_order, is_active: true });

// Jewellery (1)
//   Necklaces (1a)
//   Earrings (1b)
//     Studs (1b-i)
// Candles (2)
const TREE: ProductTypeRow[] = [
  row("2", null, "Candles", 10),
  row("1", null, "Jewellery", 0),
  row("1a", "1", "Necklaces", 0),
  row("1b", "1", "Earrings", 10),
  row("1b-i", "1b", "Studs", 0),
];

describe("flattenProductTypeTree", () => {
  it("orders depth-first, each node's children immediately after it, siblings by sort_order", () => {
    const flat = flattenProductTypeTree(TREE);
    expect(flat.map((n) => n.id)).toEqual(["1", "1a", "1b", "1b-i", "2"]);
  });
  it("assigns depth correctly at every level", () => {
    const flat = flattenProductTypeTree(TREE);
    const depthOf = (id: string) => flat.find((n) => n.id === id)?.depth;
    expect(depthOf("1")).toBe(0);
    expect(depthOf("1a")).toBe(1);
    expect(depthOf("1b")).toBe(1);
    expect(depthOf("1b-i")).toBe(2);
    expect(depthOf("2")).toBe(0);
  });
  it("sorts siblings missing an explicit order by name", () => {
    const flat = flattenProductTypeTree([row("b", null, "Beta"), row("a", null, "Alpha")]);
    expect(flat.map((n) => n.id)).toEqual(["a", "b"]);
  });
});

describe("descendantIds", () => {
  it("collects every descendant at every depth, never the root itself", () => {
    expect(descendantIds(TREE, "1")).toEqual(new Set(["1a", "1b", "1b-i"]));
  });
  it("returns an empty set for a leaf node", () => {
    expect(descendantIds(TREE, "1b-i")).toEqual(new Set());
  });
  it("returns an empty set for an id not in the tree", () => {
    expect(descendantIds(TREE, "missing")).toEqual(new Set());
  });
});

describe("ancestorChain", () => {
  it("returns the full chain from root to the node, inclusive", () => {
    expect(ancestorChain(TREE, "1b-i").map((n) => n.id)).toEqual(["1", "1b", "1b-i"]);
  });
  it("returns just the node itself for a top-level type", () => {
    expect(ancestorChain(TREE, "2").map((n) => n.id)).toEqual(["2"]);
  });
  it("returns an empty array for an id not in the tree", () => {
    expect(ancestorChain(TREE, "missing")).toEqual([]);
  });
  it("stops defensively instead of looping forever on a corrupt cycle", () => {
    const cyclic: ProductTypeRow[] = [row("x", "y", "X"), row("y", "x", "Y")];
    expect(ancestorChain(cyclic, "x").length).toBeLessThanOrEqual(2);
  });
});

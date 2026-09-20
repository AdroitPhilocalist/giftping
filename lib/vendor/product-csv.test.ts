import { describe, expect, it } from "vitest";
import { buildTemplateRows, cleanText, MAX_IMPORT_ROWS, parseCsv, parseMoney, parseProductCsv, type CategoryRef } from "./product-csv";

const categories: CategoryRef[] = [
  { id: "11111111-1111-4111-8111-111111111111", name: "Birthday", slug: "birthday" },
  { id: "22222222-2222-4222-8222-222222222222", name: "For Her", slug: "for-her" },
];
const HEADER = "name,category,price,sale_price,stock,sku,variants,occasions,recipients,tags,gst_rate";
const parse = (...lines: string[]) => parseProductCsv([HEADER, ...lines].join("\n"), categories);

describe("parseCsv", () => {
  it("handles quotes, escaped quotes, embedded commas and newlines", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi"""\n"two\nlines",z')).toEqual([["a", "b"], ["x, y", 'say "hi"'], ["two\nlines", "z"]]);
  });
  it("copes with CRLF, a UTF-8 BOM, blank lines and a missing final newline", () => {
    expect(parseCsv("﻿a,b\r\n1,2\r\n\r\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
  });
  it("detects semicolons and tabs (Excel in some locales)", () => {
    expect(parseCsv("a;b\n1;2")).toEqual([["a", "b"], ["1", "2"]]);
    expect(parseCsv("a\tb\n1\t2")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("keeps commas that live inside a semicolon-delimited cell", () => {
    expect(parseCsv("a;b\n1,5;x")).toEqual([["a", "b"], ["1,5", "x"]]);
  });
  it("reports a quote that never closes", () => {
    expect(() => parseCsv('a,b\n"oops,1')).toThrow(/never closes/);
  });
});

describe("parseMoney / cleanText", () => {
  it("reads plain and formatted prices, refuses the rest", () => {
    expect(parseMoney("1299")).toBe(1299);
    expect(parseMoney("1299.5")).toBe(1299.5);
    expect(parseMoney("₹1,299")).toBe(1299);
    expect(parseMoney("Rs. 12,99,999")).toBe(1299999);
    for (const bad of ["", "abc", "12.345", "-5", "1e3", "12,3", "0x10"]) expect(parseMoney(bad), bad).toBeNull();
    expect(parseMoney("-50", true)).toBe(-50);
  });
  it("strips control characters", () => {
    expect(cleanText("a\u0000b\tc\nd")).toBe("a b c d");
    expect(cleanText("line1\nline2\u0007", true)).toBe("line1\nline2");
  });
});

describe("parseProductCsv — headers", () => {
  it("accepts friendly, reordered and differently-cased headers", () => {
    const r = parseProductCsv("Stock,MRP,Product Name,Category\n5,₹1,299,Candle,birthday", categories);
    // the unquoted ₹1,299 splits into two cells, so use quotes for a real file:
    const ok = parseProductCsv('Stock,MRP,Product Name,Category\n5,"₹1,299",Candle,birthday', categories);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(ok.errors).toEqual([]);
    expect(ok.products[0]).toMatchObject({ name: "Candle", basePrice: 1299, stockQuantity: 5, categoryId: categories[0].id });
  });
  it("explains a missing required column", () => {
    const r = parseProductCsv("name,price\nA,5", categories);
    expect(r.products).toEqual([]);
    expect(r.errors[0].message).toMatch(/category, stock/);
  });
  it("warns about columns it doesn't use", () => {
    const r = parseProductCsv("name,category,price,stock,colour\nCandle Set,birthday,100,1,red", categories);
    expect(r.warnings[0].message).toMatch(/colour/);
    expect(r.errors).toEqual([]);
  });
  it("rejects empty files, header-only files and oversize files", () => {
    expect(parseProductCsv("", categories).errors[0].message).toMatch(/empty/);
    expect(parseProductCsv("name,category,price,stock", categories).errors[0].message).toMatch(/no products/);
    const many = ["name,category,price,stock", ...Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Item ${i},birthday,10,1`)].join("\n");
    expect(parseProductCsv(many, categories).errors[0].message).toMatch(/up to 200/);
    expect(parseProductCsv("x".repeat(700_000), categories).errors[0].message).toMatch(/too large/);
  });
});

describe("parseProductCsv — rows", () => {
  it("turns a complete row into a validated product", () => {
    const r = parse('Handmade Candle,Birthday,1299,999,40,CANDLE-1,"Scent:Lavender|Scent:Vanilla:50:15","birthday; Thank You","for her",candles;handmade,12');
    expect(r.errors).toEqual([]);
    expect(r.products).toHaveLength(1);
    expect(r.products[0]).toMatchObject({
      row: 2, name: "Handmade Candle", categoryId: categories[0].id, basePrice: 1299, salePrice: 999, stockQuantity: 40, sku: "CANDLE-1", gstRate: 12,
      occasionTags: ["birthday", "thank-you"], recipientTags: ["for-her"], tags: ["candles", "handmade"],
      variants: [
        { name: "Scent", value: "Lavender", priceAdjustment: 0, stockQuantity: 0 },
        { name: "Scent", value: "Vanilla", priceAdjustment: 50, stockQuantity: 15 },
      ],
    });
  });
  it("finds categories by name or slug, ignoring case", () => {
    const r = parse("Photo Frame,for her,500,,3,,,,,,", "Gift Box,FOR-HER,500,,3,,,,,,");
    expect(r.errors).toEqual([]);
    expect(r.products.map((p) => p.categoryId)).toEqual([categories[1].id, categories[1].id]);
  });
  it("defaults GST to 18 and keeps optional fields null", () => {
    const p = parse("Simple Item,birthday,100,,1,,,,,,").products[0];
    expect(p).toMatchObject({ gstRate: 18, salePrice: null, sku: null, weightGrams: null, variants: [], tags: [] });
  });
  it("points at the exact row and column of each problem", () => {
    const r = parse(
      "Good Item,birthday,100,,1,,,,,,",
      ",birthday,100,,1,,,,,,",
      "Bad Cat,nowhere,100,,1,,,,,,",
      "Bad Price,birthday,abc,,1,,,,,,",
      "Bad Stock,birthday,100,,1.5,,,,,,",
      "Sale Too High,birthday,100,150,1,,,,,,",
      "Bad Occasion,birthday,100,,1,,,christmas,,,",
      "Bad Variant,birthday,100,,1,,Size,,,,",
      "Bad GST,birthday,100,,1,,,,,,40",
    );
    expect(r.products.map((p) => p.name)).toEqual(["Good Item"]);
    const at = (row: number) => r.errors.filter((e) => e.row === row).map((e) => e.column);
    expect(at(3)).toContain("name");
    expect(at(4)).toContain("category");
    expect(at(5)).toContain("price");
    expect(at(6)).toContain("stock");
    expect(at(7)).toContain("sale_price");
    expect(at(8)).toContain("occasions");
    expect(at(9)).toContain("variants");
    expect(at(10)).toContain("gst_rate");
    expect(r.errors.find((e) => e.row === 4)!.message).toMatch(/Birthday, For Her/);
  });
  it("refuses duplicate SKUs within the file and duplicate variants within a row", () => {
    const r = parse("One Item,birthday,10,,1,SKU-A,,,,,", "Two Item,birthday,10,,1,sku-a,,,,,", 'Three Item,birthday,10,,1,,"Size:S|size:s",,,,');
    expect(r.errors.find((e) => e.row === 3)!.message).toMatch(/row 2/);
    expect(r.errors.find((e) => e.row === 4)!.message).toMatch(/listed twice/);
  });
  it("warns (does not fail) about repeated names and suspicious sale prices", () => {
    const r = parse("Same Name,birthday,100,,1,,,,,,", "Same Name,birthday,100,10,1,,,,,,");
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.column)).toEqual(expect.arrayContaining(["name", "sale_price"]));
  });
  it("stores hostile-looking text as plain text (it is rendered escaped and neutralised on export)", () => {
    const r = parse('"=HYPERLINK(""http://x"")",birthday,100,,1,,,,,,');
    expect(r.errors).toEqual([]);
    expect(r.products[0].name).toBe('=HYPERLINK("http://x")');
  });
  it("skips blank rows but keeps spreadsheet row numbers", () => {
    const r = parse("A Product,birthday,10,,1,,,,,,", ",,,,,,,,,,", "B Product,nowhere,10,,1,,,,,,");
    expect(r.errors[0].row).toBe(4); // the blank line is row 3 in a spreadsheet, so the bad product is row 4
  });
});

describe("buildTemplateRows", () => {
  it("produces a header plus examples that the parser itself accepts", () => {
    const rows = buildTemplateRows(["Birthday", "For Her"]);
    const text = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(",")).join("\n");
    const parsed = parseProductCsv(text, categories);
    expect(parsed.errors).toEqual([]);
    expect(parsed.products).toHaveLength(2);
    expect(parsed.products[0].variants).toHaveLength(2);
  });
});

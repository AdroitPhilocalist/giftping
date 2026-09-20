import { OCCASION_TAGS, RECIPIENT_TAGS } from "../catalog/tags";
import { productSchema } from "../validation/product.schema";

/**
 * Bulk product upload — the pure half (no database, no network; unit-tested). Turns the text of a CSV file into validated products, or into a precise list of
 * what is wrong ("row 7, price: …") so a vendor can fix their spreadsheet. Every product is validated with the SAME productSchema the manual product form uses,
 * so a CSV can never create anything the form wouldn't.
 *
 * Format: one row per product; the first row is the header; columns can be in any order and their names are forgiving ("Price", "base_price", "MRP" …).
 * Variants go in one cell: `Size:Small|Size:Large:200:5` = type:value[:extra price[:stock]] separated by |.
 */
export const MAX_IMPORT_ROWS = 200;
export const MAX_IMPORT_CHARS = 600_000;

export class CsvError extends Error {}

/** RFC 4180 parsing: quoted cells (with "" escapes and embedded commas/newlines), CRLF/LF/CR line ends, UTF-8 BOM, `,` `;` or tab delimiters (auto-detected). */
export interface CsvRecord { row: number; cells: string[] }

export function parseCsv(input: string): string[][] {
  return parseCsvRecords(input).map((r) => r.cells);
}

/** Like parseCsv, but each non-blank record keeps the row number a spreadsheet would show (blank rows still count), so error messages point at the right row. */
export function parseCsvRecords(input: string): CsvRecord[] {
  let text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  text = text.replace(/\r\n?/g, "\n");

  const firstLine = text.split("\n", 1)[0] ?? "";
  const outsideQuotes = firstLine.replace(/"[^"]*"/g, "");
  const counts: Record<string, number> = { ",": 0, ";": 0, "\t": 0 };
  for (const ch of outsideQuotes) if (ch in counts) counts[ch] += 1;
  // the most frequent candidate wins; a header with none of them (a single column) falls back to a comma
  const delimiter = ([",", ";", "\t"] as const).reduce((best, d) => (counts[d] > counts[best] ? d : best), ",");

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell === "") {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(cell); cell = "";
    } else if (ch === "\n") {
      row.push(cell); cell = "";
      rows.push(row); row = [];
      line++;
    } else {
      cell += ch;
    }
  }
  if (inQuotes) throw new CsvError(`A quote that opens on line ${line} never closes — check the cell has a matching closing quote.`);
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.map((cells, i) => ({ row: i + 1, cells })).filter((r) => r.cells.some((c) => c.trim() !== ""));
}

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

const ALIASES: Record<string, string[]> = {
  name: ["name", "product_name", "title", "product"],
  category: ["category", "category_name"],
  price: ["price", "base_price", "mrp", "regular_price", "selling_price"],
  sale_price: ["sale_price", "offer_price", "discount_price"],
  stock: ["stock", "stock_quantity", "quantity", "qty", "inventory"],
  sku: ["sku", "item_code"],
  short_description: ["short_description", "tagline", "summary"],
  description: ["description", "details"],
  weight_grams: ["weight_grams", "weight", "weight_g", "weight_in_grams"],
  gst_rate: ["gst_rate", "gst", "gst_percent", "gst_percentage"],
  hsn_code: ["hsn_code", "hsn"],
  tags: ["tags", "keywords"],
  occasions: ["occasions", "occasion", "occasion_tags"],
  recipients: ["recipients", "recipient", "recipient_tags", "for"],
  variants: ["variants", "options"],
};
const REQUIRED = ["name", "category", "price", "stock"] as const;

export const TEMPLATE_COLUMNS = ["name", "category", "price", "sale_price", "stock", "sku", "short_description", "description", "weight_grams", "gst_rate", "hsn_code", "tags", "occasions", "recipients", "variants"] as const;

export interface CategoryRef { id: string; name: string; slug: string }
export interface ImportVariant { name: string; value: string; priceAdjustment: number; stockQuantity: number }
export interface ImportProduct {
  row: number;
  name: string;
  categoryId: string;
  shortDescription: string | null;
  description: string | null;
  basePrice: number;
  salePrice: number | null;
  sku: string | null;
  stockQuantity: number;
  weightGrams: number | null;
  gstRate: number;
  hsnCode: string | null;
  tags: string[];
  occasionTags: string[];
  recipientTags: string[];
  variants: ImportVariant[];
}
export interface RowIssue { row: number | null; column: string | null; message: string }
export interface ParsedImport { products: ImportProduct[]; errors: RowIssue[]; warnings: RowIssue[]; rowCount: number }

const COLUMN_FOR_FIELD: Record<string, string> = {
  name: "name", categoryId: "category", basePrice: "price", salePrice: "sale_price", stockQuantity: "stock", sku: "sku", shortDescription: "short_description",
  description: "description", weightGrams: "weight_grams", gstRate: "gst_rate", hsnCode: "hsn_code", tags: "tags", occasionTags: "occasions", recipientTags: "recipients", variants: "variants",
};

// Built from string escapes (not regex literals) so no raw control characters live in this source file.
const CONTROL_ANY = new RegExp("[\\u0000-\\u001f\\u007f]", "g");
const CONTROL_EXCEPT_NEWLINE = new RegExp("[\\u0000-\\u0009\\u000b-\\u001f\\u007f]", "g");

/** Text from a spreadsheet: no control characters, no stray edge whitespace. Descriptions keep their line breaks. */
export function cleanText(value: string, keepNewlines = false): string {
  if (keepNewlines) return value.replace(CONTROL_EXCEPT_NEWLINE, "").replace(/[ \t]+/g, " ").trim();
  return value.replace(CONTROL_ANY, " ").replace(/\s+/g, " ").trim();
}

/** "1299", "1299.50", "₹1,299", "Rs. 1299" -> number; anything else -> null. */
export function parseMoney(value: string, allowNegative = false): number | null {
  let v = value.trim().replace(/^(?:₹|rs\.?|inr)\s*/i, "").replace(/\s+/g, "");
  if (/^-?\d{1,3}(,\d{2,3})+(\.\d+)?$/.test(v)) v = v.replace(/,/g, "");
  const pattern = allowNegative ? /^[-+]?\d+(\.\d{1,2})?$/ : /^\d+(\.\d{1,2})?$/;
  return pattern.test(v) ? Number(v) : null;
}

const tagKey = (v: string) => v.trim().toLowerCase().replace(/[\s_]+/g, "-");
const splitList = (v: string) => v.split(/[;|,]/).map((t) => t.trim()).filter(Boolean);

export function parseProductCsv(text: string, categories: CategoryRef[]): ParsedImport {
  const errors: RowIssue[] = [];
  const warnings: RowIssue[] = [];
  const fail = (): ParsedImport => ({ products: [], errors, warnings, rowCount: 0 });

  if (text.length > MAX_IMPORT_CHARS) {
    errors.push({ row: null, column: null, message: "That file is too large. Split it into files of up to 200 products." });
    return fail();
  }
  let rows: CsvRecord[];
  try {
    rows = parseCsvRecords(text);
  } catch (error) {
    errors.push({ row: null, column: null, message: error instanceof CsvError ? error.message : "That file couldn't be read as a CSV." });
    return fail();
  }
  if (rows.length === 0) {
    errors.push({ row: null, column: null, message: "The file is empty." });
    return fail();
  }

  // ---- header
  const header = rows[0].cells.map(norm);
  const index = new Map<string, number>();
  for (const [field, names] of Object.entries(ALIASES)) {
    const at = header.findIndex((h) => names.includes(h));
    if (at !== -1) index.set(field, at);
  }
  const missing = REQUIRED.filter((f) => !index.has(f));
  if (missing.length > 0) {
    errors.push({ row: rows[0].row, column: null, message: `The first row must be a header that includes: ${missing.join(", ")}. Download the template to see the layout.` });
    return fail();
  }
  const known = new Set([...index.values()]);
  const ignored = rows[0].cells.filter((c, i) => !known.has(i) && c.trim() !== "");
  if (ignored.length > 0) warnings.push({ row: rows[0].row, column: null, message: `These columns aren't used and were ignored: ${ignored.join(", ")}.` });

  const data = rows.slice(1);
  if (data.length === 0) {
    errors.push({ row: null, column: null, message: "The file has a header but no products." });
    return fail();
  }
  if (data.length > MAX_IMPORT_ROWS) {
    errors.push({ row: null, column: null, message: `A file can have up to ${MAX_IMPORT_ROWS} products; this one has ${data.length}. Split it into smaller files.` });
    return fail();
  }

  const byName = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c]));
  const bySlug = new Map(categories.map((c) => [c.slug.toLowerCase(), c]));
  const cell = (r: string[], field: string) => (index.has(field) ? (r[index.get(field)!] ?? "") : "");

  const products: ImportProduct[] = [];
  const seenSku = new Map<string, number>();
  const seenName = new Map<string, number>();

  data.forEach((record) => {
    const r = record.cells;
    const row = record.row; // the row number a spreadsheet shows
    const problems: RowIssue[] = [];
    const bad = (column: string, message: string) => problems.push({ row, column, message });

    const name = cleanText(cell(r, "name"));
    if (!name) bad("name", "Enter the product name.");

    const categoryText = cleanText(cell(r, "category"));
    const category = byName.get(categoryText.toLowerCase()) ?? bySlug.get(categoryText.toLowerCase()) ?? bySlug.get(tagKey(categoryText));
    if (!categoryText) bad("category", "Enter a category.");
    else if (!category) bad("category", `"${categoryText}" isn't one of our categories. Use one of: ${categories.map((c) => c.name).join(", ")}.`);

    const priceText = cell(r, "price");
    const basePrice = parseMoney(priceText);
    if (basePrice === null) bad("price", priceText.trim() === "" ? "Enter the regular price." : `"${priceText.trim()}" isn't a valid price — use a number like 1299 or 1299.50.`);

    const saleText = cell(r, "sale_price");
    const salePrice = saleText.trim() === "" ? null : parseMoney(saleText);
    if (saleText.trim() !== "" && salePrice === null) bad("sale_price", `"${saleText.trim()}" isn't a valid price — use a number like 999, or leave it blank.`);

    const stockText = cell(r, "stock").trim();
    const stock = /^\d+$/.test(stockText) ? Number(stockText) : null;
    if (stock === null) bad("stock", stockText === "" ? "Enter how many you have in stock (0 is fine)." : `"${stockText}" isn't a whole number of units.`);

    const weightText = cell(r, "weight_grams").trim();
    const weight = weightText === "" ? null : /^\d+$/.test(weightText) ? Number(weightText) : null;
    if (weightText !== "" && weight === null) bad("weight_grams", `"${weightText}" isn't a whole number of grams.`);

    const gstText = cell(r, "gst_rate").trim().replace(/%$/, "");
    const gst = gstText === "" ? 18 : /^\d+(\.\d{1,2})?$/.test(gstText) ? Number(gstText) : null;
    if (gst === null) bad("gst_rate", `"${gstText}" isn't a valid GST percentage (0–28).`);

    const list = (field: "occasions" | "recipients", allowed: readonly string[]) => {
      const out: string[] = [];
      for (const raw of splitList(cell(r, field))) {
        const key = tagKey(raw);
        if (!allowed.includes(key)) bad(field, `"${raw}" isn't a valid ${field === "occasions" ? "occasion" : "recipient"}. Use: ${allowed.join(", ")}.`);
        else if (!out.includes(key)) out.push(key);
      }
      return out;
    };
    const occasionTags = list("occasions", OCCASION_TAGS);
    const recipientTags = list("recipients", RECIPIENT_TAGS);

    const variants: ImportVariant[] = [];
    const seenVariant = new Set<string>();
    for (const raw of cell(r, "variants").split("|").map((v) => v.trim()).filter(Boolean)) {
      const parts = raw.split(":").map((p) => p.trim());
      const shape = `"${raw}" should look like Size:Large or Size:Large:200:5 (type:value:extra price:stock).`;
      if (parts.length < 2 || parts.length > 4 || !parts[0] || !parts[1]) { bad("variants", shape); continue; }
      const adjustment = parts[2] === undefined || parts[2] === "" ? 0 : parseMoney(parts[2], true);
      const variantStock = parts[3] === undefined || parts[3] === "" ? 0 : /^\d+$/.test(parts[3]) ? Number(parts[3]) : null;
      if (adjustment === null || variantStock === null) { bad("variants", shape); continue; }
      const key = `${parts[0].toLowerCase()}:${parts[1].toLowerCase()}`;
      if (seenVariant.has(key)) { bad("variants", `"${parts[0]}: ${parts[1]}" is listed twice.`); continue; }
      seenVariant.add(key);
      variants.push({ name: cleanText(parts[0]), value: cleanText(parts[1]), priceAdjustment: adjustment, stockQuantity: variantStock });
    }

    const sku = cleanText(cell(r, "sku"));
    if (sku) {
      const first = seenSku.get(sku.toLowerCase());
      if (first) bad("sku", `SKU "${sku}" is also used on row ${first}. Every SKU must be unique.`);
      else seenSku.set(sku.toLowerCase(), row);
    }

    // Everything else is judged by the same schema as the manual product form.
    if (problems.length === 0 && category && basePrice !== null && stock !== null && gst !== null) {
      const parsed = productSchema.safeParse({
        name,
        categoryId: category.id,
        shortDescription: cleanText(cell(r, "short_description")),
        description: cleanText(cell(r, "description"), true),
        basePrice,
        salePrice: salePrice ?? undefined,
        sku,
        stockQuantity: stock,
        weightGrams: weight ?? undefined,
        gstRate: gst,
        hsnCode: cleanText(cell(r, "hsn_code")),
        tags: splitList(cell(r, "tags")).join(","),
        occasionTags,
        recipientTags,
        variants,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) bad(COLUMN_FOR_FIELD[String(issue.path[0])] ?? String(issue.path[0] ?? ""), issue.message);
      } else {
        const v = parsed.data;
        products.push({
          row, name: v.name, categoryId: v.categoryId,
          shortDescription: v.shortDescription || null, description: v.description || null,
          basePrice: v.basePrice, salePrice: v.salePrice ?? null, sku: v.sku || null, stockQuantity: v.stockQuantity,
          weightGrams: v.weightGrams ?? null, gstRate: v.gstRate, hsnCode: v.hsnCode || null,
          tags: Array.from(new Set(splitList(cell(r, "tags")).map((t) => t.toLowerCase().slice(0, 30)))).slice(0, 15),
          occasionTags: v.occasionTags, recipientTags: v.recipientTags,
          variants: v.variants.map((x) => ({ name: x.name, value: x.value, priceAdjustment: x.priceAdjustment, stockQuantity: x.stockQuantity })),
        });
      }
    }
    errors.push(...problems);

    if (name) {
      const same = seenName.get(name.toLowerCase());
      if (same) warnings.push({ row, column: "name", message: `"${name}" has the same name as row ${same} — that's allowed, but check it isn't a duplicate.` });
      else seenName.set(name.toLowerCase(), row);
    }
    if (basePrice !== null && salePrice !== null && salePrice < basePrice && salePrice < basePrice * 0.3) {
      warnings.push({ row, column: "sale_price", message: `The sale price is over 70% below the regular price — is that right?` });
    }
  });

  return { products, errors, warnings, rowCount: data.length };
}

/** The template a vendor downloads: the header plus example rows using real category names. */
export function buildTemplateRows(categoryNames: string[]): string[][] {
  const c1 = categoryNames[0] ?? "Birthday";
  const c2 = categoryNames[1] ?? c1;
  return [
    [...TEMPLATE_COLUMNS],
    ["Handmade Soy Candle Set", c1, "1299", "999", "40", "CANDLE-001", "Set of 3 scented candles", "Hand-poured soy wax candles in a gift box.", "650", "18", "3406", "candles;handmade", "birthday;housewarming", "for-her", "Scent:Lavender|Scent:Vanilla:0:15"],
    ["Personalised Photo Frame", c2, "899", "", "25", "FRAME-002", "", "Wooden frame with a custom engraving.", "400", "18", "", "frame;personalised", "anniversary", "for-him;for-parents", ""],
  ];
}

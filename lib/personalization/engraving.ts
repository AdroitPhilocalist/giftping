/**
 * Live "engraving" personalisation — a product can offer a line of customer text (a name on a plate, a date on a keepsake box) shown ON the product photo as
 * the shopper types. Pure and zod-free ON PURPOSE: the product page's client code imports it, and the zod runtime must never be pulled into that bundle (same
 * reason as lib/commerce/personalization.ts). The vendor's setup lives in `products.personalization_options` (a jsonb array, always `[]` until now).
 *
 * The stored JSON is treated as UNTRUSTED on every read — it's vendor-editable — so `parsePersonalizationOptions` clamps every number and drops anything
 * unexpected rather than throwing; a bad value can make the preview look odd but can never break a page or inject styling.
 */
export const ENGRAVING_STYLES = [
  { id: "gold", label: "Gold foil", font: "serif", upper: true, charWidth: 0.8, spacing: "0.08em" },
  { id: "deep", label: "Deep engraving", font: "serif", upper: true, charWidth: 0.8, spacing: "0.06em" },
  { id: "cream", label: "Cream print", font: "sans", upper: true, charWidth: 0.82, spacing: "0.1em" },
  { id: "script", label: "Handwritten", font: "script", upper: false, charWidth: 0.46, spacing: "0" },
] as const;

export type EngravingStyleId = (typeof ENGRAVING_STYLES)[number]["id"];
export const ENGRAVING_STYLE_IDS = ENGRAVING_STYLES.map((s) => s.id) as [EngravingStyleId, ...EngravingStyleId[]];
export const getEngravingStyle = (id: string) => ENGRAVING_STYLES.find((s) => s.id === id) ?? ENGRAVING_STYLES[0];

/** Where the text sits on the product's main photo — all in PERCENT of the photo, so it scales with it. */
export interface EngravingPlacement {
  x: number;
  y: number;
  w: number;
  h: number;
  /** degrees */
  rotate: number;
}

export interface EngravingConfig extends EngravingPlacement {
  label: string;
  maxLength: number;
  required: boolean;
  style: EngravingStyleId;
}

export const ENGRAVING_LIMITS = { minLength: 3, maxLength: 60, labelMax: 40, minW: 8, minH: 3, maxRotate: 30 } as const;

export const DEFAULT_ENGRAVING: EngravingConfig = { label: "Name to engrave", maxLength: 20, required: true, style: "gold", x: 30, y: 42, w: 40, h: 12, rotate: 0 };

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Keep the box on the photo and a usable size, whatever was asked for. */
export function clampPlacement(p: EngravingPlacement): EngravingPlacement {
  const w = clamp(p.w, ENGRAVING_LIMITS.minW, 100);
  const h = clamp(p.h, ENGRAVING_LIMITS.minH, 100);
  return {
    w: round1(w),
    h: round1(h),
    x: round1(clamp(p.x, 0, 100 - w)),
    y: round1(clamp(p.y, 0, 100 - h)),
    rotate: round1(clamp(p.rotate, -ENGRAVING_LIMITS.maxRotate, ENGRAVING_LIMITS.maxRotate)),
  };
}

/** The product's engraving setup, or null if it has none. Tolerant: unknown shapes → null, every number clamped, the label cleaned. */
export function parsePersonalizationOptions(json: unknown): EngravingConfig | null {
  if (!Array.isArray(json)) return null;
  const entry = json.find((o): o is Record<string, unknown> => Boolean(o) && typeof o === "object" && (o as { type?: unknown }).type === "engraving");
  if (!entry) return null;
  const label = typeof entry.label === "string" ? entry.label.replace(/\s+/g, " ").trim().slice(0, ENGRAVING_LIMITS.labelMax) : "";
  const style = ENGRAVING_STYLES.find((s) => s.id === entry.style)?.id ?? DEFAULT_ENGRAVING.style;
  return {
    label: label || DEFAULT_ENGRAVING.label,
    maxLength: Math.round(clamp(num(entry.maxLength, DEFAULT_ENGRAVING.maxLength), ENGRAVING_LIMITS.minLength, ENGRAVING_LIMITS.maxLength)),
    required: entry.required === true,
    style,
    ...clampPlacement({ x: num(entry.x, DEFAULT_ENGRAVING.x), y: num(entry.y, DEFAULT_ENGRAVING.y), w: num(entry.w, DEFAULT_ENGRAVING.w), h: num(entry.h, DEFAULT_ENGRAVING.h), rotate: num(entry.rotate, 0) }),
  };
}

/** What gets stored: `[]` for none (the column's default), else one tagged entry (room for other option types later). */
export function toPersonalizationOptions(config: EngravingConfig | null): Record<string, unknown>[] {
  if (!config) return [];
  const c = { ...config, ...clampPlacement(config) };
  return [{ type: "engraving", label: c.label, maxLength: c.maxLength, required: c.required, style: c.style, x: c.x, y: c.y, w: c.w, h: c.h, rotate: c.rotate }];
}

// Letters and digits in any script (Indian names!), combining marks, spaces and a little punctuation. No line breaks, no symbols that could be read as markup.
const ALLOWED = /^[\p{L}\p{M}\p{N} .,'’&!+-]+$/u;

export type EngravingTextResult = { ok: true; text: string | null } | { ok: false; error: string };

/**
 * Check what the shopper typed against the product's setup — used in the browser for instant feedback AND on the server before anything is saved (the
 * browser is never trusted). Returns the cleaned text (whitespace collapsed) or null when optional and left blank.
 */
export function normaliseEngraving(raw: string | null | undefined, config: Pick<EngravingConfig, "label" | "maxLength" | "required">): EngravingTextResult {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  const what = config.label.toLowerCase();
  if (text === "") return config.required ? { ok: false, error: `Please enter the ${what}.` } : { ok: true, text: null };
  if ([...text].length > config.maxLength) return { ok: false, error: `Keep the ${what} to ${config.maxLength} characters or fewer.` };
  if (!ALLOWED.test(text)) return { ok: false, error: `The ${what} can use letters, numbers and simple punctuation only.` };
  return { ok: true, text };
}

/**
 * The text's font size, as a percentage of the photo's WIDTH (the preview uses container-query units, 1cqw = 1% of the photo's width), so the line always
 * fits its box: as large as the box height allows, but no wider than the box. A conservative per-character width means it errs small, never overflowing.
 */
export function fitFontSize(text: string, box: { w: number; h: number }, styleId: string): number {
  const style = getEngravingStyle(styleId);
  const chars = Math.max(3, [...text].length);
  const byWidth = box.w / (chars * style.charWidth);
  const byHeight = box.h * 0.82; // the photo is square, so a % of its height equals the same % of its width
  return round1(clamp(Math.min(byWidth, byHeight), 0.8, 40));
}

/** The line as it appears: some styles (foil, engraved, printed) are capitals. */
export function displayEngraving(text: string, styleId: string): string {
  return getEngravingStyle(styleId).upper ? text.toLocaleUpperCase() : text;
}

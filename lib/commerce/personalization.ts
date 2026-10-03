// Split out of lib/validation/cart.schema.ts on purpose: this constant is imported directly by
// components/shop/ProductBuyBox.tsx (a "use client" component on every product page) just to render four
// button labels. Kept in its own zod-free module so that import can never pull the zod runtime into the
// product-page client bundle — cart.schema.ts (server-side validation) re-exports it for the same name.
export const PERSONALIZATION_OCCASIONS = ["Birthday", "Anniversary", "Thank You", "Other"] as const;

/** The personalisation keys we keep, in the order they're shown. `engraving` first: it is the one a boutique has to carry out EXACTLY. */
export const PERSONALIZATION_KEYS = ["engraving", "recipientName", "occasion", "giftMessage"] as const;

const LABELS: Record<(typeof PERSONALIZATION_KEYS)[number], string> = { engraving: "Engraving", recipientName: "For", occasion: "Occasion", giftMessage: "Note" };

/** Labelled lines for whatever personalisation a line has (empty array for none). One place so the cart, checkout, order and vendor views can't drift apart. */
export function personalizationLines(p: Record<string, unknown> | null | undefined): { key: (typeof PERSONALIZATION_KEYS)[number]; label: string; value: string }[] {
  if (!p || typeof p !== "object") return [];
  return PERSONALIZATION_KEYS.flatMap((key) => {
    const v = p[key];
    return typeof v === "string" && v.trim() !== "" ? [{ key, label: LABELS[key], value: v }] : [];
  });
}

/** The same, as one short line — "Engraving “Aarav” · For Mom · Birthday · “Many happy returns”". */
export function personalizationSummary(p: Record<string, unknown> | null | undefined): string {
  return personalizationLines(p)
    .map((l) => (l.key === "engraving" ? `Engraving “${l.value}”` : l.key === "recipientName" ? `For ${l.value}` : l.key === "giftMessage" ? `“${l.value}”` : l.value))
    .join(" · ");
}

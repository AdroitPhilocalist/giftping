// Split out of lib/validation/cart.schema.ts on purpose: this constant is imported directly by
// components/shop/ProductBuyBox.tsx (a "use client" component on every product page) just to render four
// button labels. Kept in its own zod-free module so that import can never pull the zod runtime into the
// product-page client bundle — cart.schema.ts (server-side validation) re-exports it for the same name.
export const PERSONALIZATION_OCCASIONS = ["Birthday", "Anniversary", "Thank You", "Other"] as const;

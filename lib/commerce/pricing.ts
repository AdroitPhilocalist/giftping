/**
 * Pure pricing/stock rules shared by the cart now and by checkout's server-side recomputation in
 * Stage 6 — one implementation so the two can never disagree about what a line costs.
 */
export const MAX_LINE_QUANTITY = 20;
export const MAX_CART_LINES = 50;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Sale price (if any) replaces the base price; variant adjustments then add on top. Never negative. */
export function computeUnitPrice(input: {
  basePrice: number;
  salePrice: number | null;
  adjustments: number[];
}): number {
  const start = input.salePrice ?? input.basePrice;
  const total = input.adjustments.reduce((sum, a) => sum + a, start);
  return Math.max(0, round2(total));
}

/** A line can only sell as many units as the scarcest thing it depends on (the product and every chosen variant). */
export function effectiveStock(productStock: number, variantStocks: number[]): number {
  return Math.max(0, Math.min(productStock, ...variantStocks));
}

/** Largest quantity a shopper may hold for a line: bounded by stock and by the per-line cap. */
export function maxPurchasable(stock: number): number {
  return Math.max(0, Math.min(stock, MAX_LINE_QUANTITY));
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return round2(unitPrice * quantity);
}

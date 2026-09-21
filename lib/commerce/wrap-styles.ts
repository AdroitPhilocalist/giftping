import type { ImageKey } from "../content/imagery";

/**
 * The gift-wrap colourways a customer can choose at checkout. The choice is cosmetic — one flat per-order wrap fee whatever the style —
 * and is stored as `orders.gift_wrap_style` (a DB CHECK pins these ids). Ids match the `wrap-<id>` artwork keys and the CHECK constraint.
 */
export const WRAP_STYLES = [
  { id: "green", label: "Classic Green", detail: "Forest green with a copper ribbon", imageKey: "wrap-green" },
  { id: "blush", label: "Blush Rose", detail: "Blush pink with a rose-gold ribbon", imageKey: "wrap-blush" },
  { id: "blue", label: "Royal Blue", detail: "Royal blue with a gold ribbon", imageKey: "wrap-blue" },
  { id: "gold", label: "Premium Gold", detail: "Rich gold with a cream ribbon", imageKey: "wrap-gold" },
  { id: "ivory", label: "Ivory & Sage", detail: "Ivory with a sage-green ribbon", imageKey: "wrap-ivory" },
] as const satisfies readonly { id: string; label: string; detail: string; imageKey: ImageKey }[];

export type WrapStyleId = (typeof WRAP_STYLES)[number]["id"];

export const WRAP_STYLE_IDS = WRAP_STYLES.map((s) => s.id) as [WrapStyleId, ...WrapStyleId[]];
export const DEFAULT_WRAP_STYLE: WrapStyleId = "green";

export function wrapStyleLabel(id: string | null | undefined): string | null {
  return WRAP_STYLES.find((s) => s.id === id)?.label ?? null;
}

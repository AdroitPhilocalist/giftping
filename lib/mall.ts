/**
 * The mall directory: the nine "places" of GiftPing and where each sits on the floor plan. Each place is a real destination — a category, the boutiques list —
 * so the map is navigation, not decoration. Positions are percentages of the artwork, one set for the code-drawn plan and one for the client's illustrated
 * map (lib/content/imagery.ts "mall-map"); when the real illustration arrives, only IMAGE_POSITIONS may need a nudge.
 */
export type ZoneIcon = "door" | "cake" | "gem" | "heart" | "store" | "flower" | "watch" | "briefcase" | "gift";

export interface MallZone {
  id: string;
  n: number;
  title: string;
  sub: string;
  href: string;
  icon: ZoneIcon;
}

export const MALL_ZONES: MallZone[] = [
  { id: "entrance", n: 1, title: "Grand Entrance", sub: "Welcome to GiftPing", href: "/", icon: "door" },
  { id: "birthday", n: 2, title: "Birthday World", sub: "Celebrate their special day", href: "/categories/birthday", icon: "cake" },
  { id: "wedding", n: 3, title: "Wedding Pavilion", sub: "For their forever moments", href: "/categories/wedding", icon: "gem" },
  { id: "anniversary", n: 4, title: "Anniversary Lane", sub: "Celebrate love, again", href: "/categories/anniversary", icon: "heart" },
  { id: "boutiques", n: 5, title: "Boutique Avenue", sub: "Curated brand stores", href: "/vendors", icon: "store" },
  { id: "for-her", n: 6, title: "Gifts for Her", sub: "Elegant, thoughtful, hers", href: "/categories/for-her", icon: "flower" },
  { id: "for-him", n: 7, title: "Gifts for Him", sub: "Timeless picks he'll love", href: "/categories/for-him", icon: "watch" },
  { id: "corporate", n: 8, title: "Corporate Lounge", sub: "Gifting that builds bonds", href: "/categories/corporate-gifting", icon: "briefcase" },
  { id: "atrium", n: 9, title: "The Gift Atrium", sub: "Our signature picks", href: "/categories", icon: "gift" },
];

export type Point = { x: number; y: number };

/** % of the drawn floor plan (viewBox 600×640) */
export const PLAN_POSITIONS: Record<string, Point> = {
  entrance: { x: 50, y: 89 },
  birthday: { x: 22, y: 76 },
  wedding: { x: 78, y: 76 },
  anniversary: { x: 16, y: 49 },
  boutiques: { x: 50, y: 14 },
  "for-her": { x: 80, y: 24 },
  "for-him": { x: 86, y: 49 },
  corporate: { x: 20, y: 24 },
  atrium: { x: 50, y: 50 },
};

/** % of the client's isometric illustration (measured from the approved reference; tune if the final artwork differs) */
export const IMAGE_POSITIONS: Record<string, Point> = {
  entrance: { x: 50, y: 87 },
  birthday: { x: 26, y: 65 },
  wedding: { x: 74, y: 65 },
  anniversary: { x: 22, y: 43 },
  boutiques: { x: 50, y: 8 },
  "for-her": { x: 77, y: 21 },
  "for-him": { x: 88, y: 37 },
  corporate: { x: 22, y: 21 },
  atrium: { x: 50, y: 44 },
};

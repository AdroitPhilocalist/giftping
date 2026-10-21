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
  /** what the robin says when it flies to this place */
  guide: string;
}

export const MALL_ZONES: MallZone[] = [
  { id: "entrance", n: 1, title: "Grand Entrance", sub: "Welcome to GiftPing", href: "/", icon: "door", guide: "Welcome in! Hover a number and I'll fly you there." },
  { id: "birthday", n: 2, title: "Birthday World", sub: "Celebrate their special day", href: "/categories/birthday", icon: "cake", guide: "Birthday World is our most loved — confetti included." },
  { id: "wedding", n: 3, title: "Wedding Pavilion", sub: "For their forever moments", href: "/categories/wedding", icon: "gem", guide: "Wedding Pavilion: gifts for their forever moments." },
  { id: "anniversary", n: 4, title: "Anniversary Lane", sub: "Celebrate love, again", href: "/categories/anniversary", icon: "heart", guide: "Anniversary Lane — for the ones you love, again." },
  { id: "boutiques", n: 5, title: "Boutique Avenue", sub: "Curated brand stores", href: "/vendors", icon: "store", guide: "Boutique Avenue: every shop is a small business we love." },
  { id: "for-her", n: 6, title: "Gifts for Her", sub: "Elegant, thoughtful, hers", href: "/categories/for-her", icon: "flower", guide: "Gifts for Her — elegant, thoughtful, hers." },
  { id: "for-him", n: 7, title: "Gifts for Him", sub: "Timeless picks he'll love", href: "/categories/for-him", icon: "watch", guide: "Gifts for Him — timeless picks he'll actually use." },
  { id: "corporate", n: 8, title: "Corporate Lounge", sub: "Gifting that builds bonds", href: "/corporate-gifting", icon: "briefcase", guide: "The Corporate Lounge: gifting that builds bonds." },
  { id: "atrium", n: 9, title: "The Gift Atrium", sub: "Our signature picks", href: "/categories", icon: "gift", guide: "The Gift Atrium: our signature picks, all in one place." },
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

/** % of the client's isometric illustration (measured from the delivered mall-map.png, 1312×1199 — re-measure if the artwork is regenerated) */
export const IMAGE_POSITIONS: Record<string, Point> = {
  entrance: { x: 48, y: 77 },
  birthday: { x: 21, y: 18 },
  wedding: { x: 83, y: 49 },
  anniversary: { x: 21, y: 74 },
  boutiques: { x: 48, y: 13 },
  "for-her": { x: 15, y: 52 },
  "for-him": { x: 78, y: 72 },
  corporate: { x: 76, y: 17 },
  atrium: { x: 48, y: 43 },
};

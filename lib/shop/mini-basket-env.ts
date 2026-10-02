/**
 * Does this browser get the hover-style mini-basket under the header icon? Only a real mouse on a desktop-width screen — on touch the icon is simply a
 * link to the basket page (a hover panel would flash open on every tap), and the product page keeps its "Added" toast instead. Client-only.
 */
export function canShowMiniBasket(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches && window.innerWidth >= 1024;
}

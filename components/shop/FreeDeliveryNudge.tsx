import { DeliveryRibbon } from "@/components/shop/DeliveryRibbon";

/** Free delivery is decided per boutique, so the cart page shows one ribbon per boutique. The drawing itself lives in DeliveryRibbon (shared with the header's mini-basket). */
export function FreeDeliveryNudge({ subtotal, threshold, boutique }: { subtotal: number; threshold: number; boutique: string }) {
  if (threshold <= 0) return null;
  const reached = subtotal >= threshold;
  return <DeliveryRibbon reached={reached} pct={Math.min(100, Math.round((subtotal / threshold) * 100))} remaining={threshold - subtotal} boutique={boutique} />;
}

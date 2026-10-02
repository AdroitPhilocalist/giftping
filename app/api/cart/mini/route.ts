import { NextResponse } from "next/server";
import { cartRateLimit, checkRateLimit, getClientIp } from "@/lib/auth/rate-limit";
import { getCartView } from "@/lib/commerce/cart";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { miniBasket } from "@/lib/shop/basket";

export const dynamic = "force-dynamic";

/**
 * What the header's mini-basket shows: the visitor's OWN cart (signed-in session or the httpOnly guest-cart cookie — never anything a client can send),
 * trimmed to names, photos, quantities, prices and the free-delivery progress. Fetched on demand when the basket is opened rather than on every page
 * load, so browsing stays as cheap as before. Never cached.
 */
export async function GET(request: Request) {
  const limited = await checkRateLimit(cartRateLimit, getClientIp(request));
  if (!limited.success) return NextResponse.json({ error: "Slow down a little." }, { status: 429, headers: { "cache-control": "no-store" } });
  try {
    const [cart, settings] = await Promise.all([getCartView(), getCommerceSettings()]);
    return NextResponse.json(miniBasket(cart, settings.freeDeliveryThreshold), { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("Mini-basket failed", error);
    return NextResponse.json({ error: "Couldn't load your basket." }, { status: 500, headers: { "cache-control": "no-store" } });
  }
}

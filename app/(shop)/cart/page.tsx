import Link from "next/link";
import { Store } from "lucide-react";
import { Robin } from "@/components/art/Robin";
import { BuyAssurances } from "@/components/shop/BuyAssurances";
import { CheckoutSteps } from "@/components/shop/CheckoutSteps";
import { FreeDeliveryNudge } from "@/components/shop/FreeDeliveryNudge";
import { CartLineItem } from "@/components/shop/CartLineItem";
import { GuestCartMerger } from "@/components/shop/GuestCartMerger";
import { Button } from "@/components/ui/Button";
import { getCartView, hasUnmergedGuestCart } from "@/lib/commerce/cart";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Your Cart — GiftPing" };

export default async function CartPage() {
  const [cart, needsMerge, settings, returnDays] = await Promise.all([getCartView(), hasUnmergedGuestCart(), getCommerceSettings(), getReturnWindowDays()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      {needsMerge ? <GuestCartMerger /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-brand-secondary-dark">Your basket</p>
          <h1 className="mt-2 font-heading text-4xl text-brand-dark">
            Your <span className="accent-word">Cart</span>
            {cart.itemCount > 0 ? <span className="ml-3 align-middle text-base font-sans text-brand-dark/50">{cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}</span> : null}
          </h1>
        </div>
        {cart.groups.length > 0 ? <CheckoutSteps current={0} /> : null}
      </div>

      {cart.groups.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-card border border-brand-secondary/20 bg-gradient-to-b from-brand-accent/60 to-brand-surface p-10 text-center shadow-card sm:p-16">
          <Robin pose="peeking" priority className="w-40" title="The GiftPing robin, peeking into an empty cart" />
          <h2 className="font-heading text-2xl text-brand-dark">Your cart is empty</h2>
          <p className="max-w-sm text-brand-dark/65">Nothing here yet — let&apos;s find someone a gift they&apos;ll remember.</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/mall">Explore the Mall</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/categories">Shop by occasion</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {cart.groups.map((group) => (
              <section key={group.vendorId} className="rounded-card border border-brand-dark/[0.06] bg-brand-surface p-5 shadow-card">
                <header className="flex items-center gap-2 border-b border-brand-dark/10 pb-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-brand-secondary-dark"><Store className="h-4 w-4" aria-hidden="true" /></span>
                  {group.vendorSlug ? (
                    <Link href={`/vendors/${group.vendorSlug}`} className="font-heading text-base text-brand-dark hover:underline">
                      {group.vendorName}
                    </Link>
                  ) : (
                    <span className="font-heading text-base text-brand-dark/60">{group.vendorName}</span>
                  )}
                </header>
                <ul className="divide-y divide-brand-dark/10">
                  {group.lines.map((line) => (
                    <CartLineItem key={line.id} line={line} />
                  ))}
                </ul>
                <footer className="space-y-3 border-t border-brand-dark/10 pt-3 text-sm">
                  <FreeDeliveryNudge subtotal={group.subtotal} threshold={settings.freeDeliveryThreshold} boutique={group.vendorName} />
                  <div className="flex justify-between">
                    <span className="text-brand-dark/60">Subtotal from {group.vendorName}</span>
                    <span className="font-medium text-brand-dark">{formatCurrency(group.subtotal)}</span>
                  </div>
                </footer>
              </section>
            ))}
          </div>

          <aside className="h-fit space-y-4 rounded-card border border-brand-dark/[0.06] bg-brand-surface p-6 shadow-lift lg:sticky lg:top-32">
            <h2 className="font-heading text-xl text-brand-dark">Order summary</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-brand-dark/60">
                  Subtotal ({cart.itemCount} {cart.itemCount === 1 ? "item" : "items"})
                </dt>
                <dd className="text-brand-dark">{formatCurrency(cart.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-brand-dark/60">Delivery &amp; taxes</dt>
                <dd className="text-brand-dark/60">Calculated at checkout</dd>
              </div>
            </dl>
            {cart.hasIssues ? (
              <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">
                Some items need your attention before you can check out.
              </p>
            ) : null}
            {cart.hasIssues ? (
              <Button size="lg" className="w-full" disabled>
                Proceed to checkout
              </Button>
            ) : (
              <Button size="lg" className="w-full" asChild>
                <Link href="/checkout">Proceed to checkout</Link>
              </Button>
            )}
            <p className="text-center text-xs text-brand-dark/50">Delivery and coupons are worked out at checkout; final prices are always confirmed by us.</p>
            <BuyAssurances returnDays={returnDays} />
          </aside>
        </div>
      )}
    </div>
  );
}

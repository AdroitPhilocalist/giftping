import Link from "next/link";
import { ShoppingBag, Store } from "lucide-react";
import { CartLineItem } from "@/components/shop/CartLineItem";
import { GuestCartMerger } from "@/components/shop/GuestCartMerger";
import { Button } from "@/components/ui/Button";
import { getCartView, hasUnmergedGuestCart } from "@/lib/commerce/cart";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Your Cart — GiftPing" };

export default async function CartPage() {
  const [cart, needsMerge] = await Promise.all([getCartView(), hasUnmergedGuestCart()]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      {needsMerge ? <GuestCartMerger /> : null}
      <h1 className="font-heading text-3xl text-brand-dark">Your Cart</h1>

      {cart.groups.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-brand-dark/15 p-16 text-center">
          <ShoppingBag className="h-10 w-10 text-brand-dark/20" />
          <p className="text-brand-dark/60">Your cart is empty — let&apos;s find someone a gift.</p>
          <Button asChild>
            <Link href="/">Explore the Mall</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-6">
            {cart.groups.map((group) => (
              <section key={group.vendorId} className="rounded-2xl border border-brand-dark/10 bg-white p-5">
                <header className="flex items-center gap-2 border-b border-brand-dark/10 pb-3">
                  <Store className="h-4 w-4 text-brand-secondary-dark" />
                  {group.vendorSlug ? (
                    <Link href={`/vendors/${group.vendorSlug}`} className="font-heading text-sm text-brand-dark hover:underline">
                      {group.vendorName}
                    </Link>
                  ) : (
                    <span className="font-heading text-sm text-brand-dark/60">{group.vendorName}</span>
                  )}
                </header>
                <ul className="divide-y divide-brand-dark/10">
                  {group.lines.map((line) => (
                    <CartLineItem key={line.id} line={line} />
                  ))}
                </ul>
                <footer className="flex justify-between border-t border-brand-dark/10 pt-3 text-sm">
                  <span className="text-brand-dark/60">Subtotal from {group.vendorName}</span>
                  <span className="font-medium text-brand-dark">{formatCurrency(group.subtotal)}</span>
                </footer>
              </section>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-brand-dark/10 bg-white p-5 lg:sticky lg:top-32">
            <h2 className="font-heading text-lg text-brand-dark">Order Summary</h2>
            <dl className="mt-4 space-y-2 text-sm">
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
              <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-800">
                Some items need your attention before you can check out.
              </p>
            ) : null}
            <Button className="mt-5 w-full" disabled>
              Checkout opens soon
            </Button>
            <p className="mt-2 text-center text-xs text-brand-dark/50">
              Final prices are confirmed at checkout.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}

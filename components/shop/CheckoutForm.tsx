"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Gift, Tag, X } from "lucide-react";
import { AddressBook } from "@/components/shop/AddressBook";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { applyCouponAction, placeOrderAction, removeCouponAction } from "@/lib/commerce/checkout-actions";
import type { SavedAddress } from "@/lib/db/addresses";
import { formatCurrency } from "@/lib/utils/format";

export interface CheckoutQuoteView {
  subtotal: number;
  discount: number;
  delivery: number;
  gstTotal: number;
  /** Total WITHOUT gift wrap — the wrap fee is added here when the box is ticked. */
  totalBeforeWrap: number;
  itemCount: number;
  couponCode: string | null;
  couponMessage: string | null;
}

/**
 * The preview totals are computed on the server and passed in; the only client-side arithmetic is adding the
 * flat gift-wrap fee when it's ticked. The server recomputes everything again when the order is placed —
 * nothing on this screen is ever sent as a price.
 */
export function CheckoutForm({
  addresses,
  quote,
  giftWrapCharge,
  freeDeliveryThreshold,
  idempotencyKey,
  blocked,
  itemsSlot,
}: {
  addresses: SavedAddress[];
  quote: CheckoutQuoteView;
  giftWrapCharge: number;
  freeDeliveryThreshold: number;
  idempotencyKey: string;
  blocked: string | null;
  itemsSlot: ReactNode;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    (addresses.find((a) => a.is_default) ?? addresses[0])?.id,
  );
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCouponPending, startCouponTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const total = quote.totalBeforeWrap + (giftWrap ? giftWrapCharge : 0);
  const canPlace = !blocked && Boolean(selectedId) && !isPending;

  function applyCoupon() {
    startCouponTransition(async () => {
      const result = await applyCouponAction(couponInput);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message ?? "Coupon applied.");
      setCouponInput("");
    });
  }

  function removeCoupon() {
    startCouponTransition(async () => {
      const result = await removeCouponAction();
      if (result.error) toast.error(result.error);
    });
  }

  function placeOrder() {
    if (!selectedId) return;
    setError(null);
    startTransition(async () => {
      const result = await placeOrderAction({ addressId: selectedId, giftWrap, giftMessage, idempotencyKey });
      if (result.error || !result.orderId) {
        setError(result.error ?? "We couldn't place your order. Please try again.");
        return;
      }
      router.push(`/orders/${result.orderId}`);
    });
  }

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        <section aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="font-heading text-xl text-brand-dark">
            1. Delivery address
          </h2>
          <div className="mt-3">
            <AddressBook addresses={addresses} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
        </section>

        <section aria-labelledby="gift-heading">
          <h2 id="gift-heading" className="font-heading text-xl text-brand-dark">
            2. Make it a gift
          </h2>
          <div className="mt-3 space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={giftWrap}
                onChange={(e) => setGiftWrap(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-brand-primary"
              />
              <span>
                <span className="flex items-center gap-1 font-medium text-brand-dark">
                  <Gift className="h-4 w-4 text-brand-secondary-dark" /> Add gift wrapping
                  <span className="font-normal text-brand-dark/60">(+ {formatCurrency(giftWrapCharge)})</span>
                </span>
                <span className="text-brand-dark/60">Each vendor wraps their own items before dispatch.</span>
              </span>
            </label>
            <div>
              <label htmlFor="giftMessage" className="mb-1 block text-sm font-medium text-brand-dark">
                Gift message (optional)
              </label>
              <Textarea
                id="giftMessage"
                maxLength={250}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Printed on a card that goes in the parcel"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="items-heading">
          <h2 id="items-heading" className="font-heading text-xl text-brand-dark">
            3. Review items
          </h2>
          <div className="mt-3">{itemsSlot}</div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-brand-dark/10 bg-white p-5 lg:sticky lg:top-32">
        <h2 className="font-heading text-lg text-brand-dark">Order Summary</h2>

        {quote.couponCode ? (
          <div className="flex items-center justify-between rounded-lg bg-brand-primary/5 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-brand-primary">
              <Tag className="h-4 w-4" />
              <span className="font-medium">{quote.couponCode}</span>
            </span>
            <button type="button" onClick={removeCoupon} disabled={isCouponPending} aria-label="Remove coupon" className="text-brand-dark/50 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              applyCoupon();
            }}
            className="flex gap-2"
          >
            <Input
              aria-label="Coupon code"
              placeholder="Coupon code"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              maxLength={40}
              autoCapitalize="characters"
            />
            <Button type="submit" variant="secondary" size="sm" disabled={isCouponPending || couponInput.trim() === ""}>
              Apply
            </Button>
          </form>
        )}
        {quote.couponMessage ? <p className="text-xs font-medium text-red-700">{quote.couponMessage}</p> : null}

        <dl className="space-y-2 border-t border-brand-dark/10 pt-4 text-sm">
          <Row label={`Subtotal (${quote.itemCount} ${quote.itemCount === 1 ? "item" : "items"})`} value={formatCurrency(quote.subtotal)} />
          {quote.discount > 0 ? <Row label="Coupon discount" value={`− ${formatCurrency(quote.discount)}`} accent /> : null}
          <Row label="Delivery" value={quote.delivery === 0 ? "Free" : formatCurrency(quote.delivery)} />
          {giftWrap ? <Row label="Gift wrapping" value={formatCurrency(giftWrapCharge)} /> : null}
          <div className="flex justify-between border-t border-brand-dark/10 pt-3 font-heading text-lg text-brand-dark">
            <dt>Total</dt>
            <dd>{formatCurrency(total)}</dd>
          </div>
          <p className="text-xs text-brand-dark/50">Includes {formatCurrency(quote.gstTotal)} GST. Free delivery per vendor over {formatCurrency(freeDeliveryThreshold)}.</p>
        </dl>

        {blocked ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{blocked}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p> : null}
        {!selectedId && !blocked ? <p className="text-xs text-brand-dark/60">Add a delivery address to continue.</p> : null}

        <Button className="w-full" disabled={!canPlace} onClick={placeOrder}>
          {isPending ? "Placing your order…" : "Continue to payment"}
        </Button>
        <p className="text-center text-xs text-brand-dark/50">Final amounts are confirmed by us when you place the order.</p>
      </aside>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-brand-dark/60">{label}</dt>
      <dd className={accent ? "font-medium text-brand-primary" : "text-brand-dark"}>{value}</dd>
    </div>
  );
}

"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Check, Gift, Tag, X } from "lucide-react";
import { AddressBook } from "@/components/shop/AddressBook";
import { BuyAssurances } from "@/components/shop/BuyAssurances";
import { WrapPreview } from "@/components/shop/WrapPreview";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { applyCouponAction, checkDeliveryAction, placeOrderAction, removeCouponAction } from "@/lib/commerce/checkout-actions";
import type { VendorDelivery } from "@/lib/commerce/delivery";
import { DEFAULT_WRAP_STYLE, WRAP_STYLES, wrapStyleLabel, type WrapStyleId } from "@/lib/commerce/wrap-styles";
import { siteImage } from "@/lib/content/imagery";
import type { SavedAddress } from "@/lib/db/addresses";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

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
  expressSurcharge,
  returnDays,
  idempotencyKey,
  blocked,
  itemsSlot,
}: {
  addresses: SavedAddress[];
  quote: CheckoutQuoteView;
  giftWrapCharge: number;
  freeDeliveryThreshold: number;
  expressSurcharge: number;
  returnDays: number;
  idempotencyKey: string;
  blocked: string | null;
  itemsSlot: ReactNode;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | undefined>(
    (addresses.find((a) => a.is_default) ?? addresses[0])?.id,
  );
  const [giftWrap, setGiftWrap] = useState(false);
  const [wrapStyle, setWrapStyle] = useState<WrapStyleId>(DEFAULT_WRAP_STYLE);
  const [giftMessage, setGiftMessage] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isCouponPending, startCouponTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deliveryResult, setDeliveryResult] = useState<{ addressId: string; vendors: VendorDelivery[] } | null>(null);
  // Paired with the address it belongs to so a change of address resets it during render (React's own
  // "adjust state when a prop changes" pattern) rather than via a separate reset-only effect: a different
  // address might not offer Express on the same vendors (or at all), so a stale selection must not silently
  // keep charging for an upgrade the new pincode never actually confirmed.
  const [expressState, setExpressState] = useState<{ addressId: string | undefined; vendors: Set<string> }>({ addressId: selectedId, vendors: new Set() });
  if (expressState.addressId !== selectedId) setExpressState({ addressId: selectedId, vendors: new Set() });
  const expressVendors = expressState.vendors;

  // Serviceability + ETA for the chosen address. The server re-checks when the order is placed; this is for feedback.
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void checkDeliveryAction(selectedId).then((result) => {
      if (!cancelled) setDeliveryResult({ addressId: selectedId, vendors: result.ok ? result.vendors : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // A result only counts if it belongs to the address currently selected (otherwise we're still checking).
  const delivery = deliveryResult && deliveryResult.addressId === selectedId ? deliveryResult.vendors : [];
  const deliveryChecking = Boolean(selectedId) && deliveryResult?.addressId !== selectedId;

  const undeliverable = delivery.filter((d) => d.status === "unserviceable");
  // Only vendors we actually have something to say about (an unknown ETA renders nothing, not an empty bullet).
  const deliveryLines = delivery.flatMap((d) => {
    if (d.status === "unserviceable") return [{ key: d.vendorId, bad: true, text: `${d.vendorName} can't deliver to this pincode yet.`, express: null as typeof d | null }];
    if (d.status === "ok" && d.etdDays)
      return [{
        key: d.vendorId,
        bad: false,
        text: `${d.vendorName}: delivers in about ${d.etdDays} ${d.etdDays === 1 ? "day" : "days"} after dispatch.`,
        express: d.expressEtdDays !== null ? d : null,
      }];
    return [];
  });

  function toggleExpress(vendorId: string, on: boolean) {
    setExpressState((prev) => {
      const next = new Set(prev.vendors);
      if (on) next.add(vendorId);
      else next.delete(vendorId);
      return { addressId: prev.addressId, vendors: next };
    });
  }

  // Display-only arithmetic (same pattern as the gift-wrap fee above): the server recomputes everything
  // authoritatively from a fresh serviceability check when the order is actually placed.
  const total = quote.totalBeforeWrap + (giftWrap ? giftWrapCharge : 0) + expressVendors.size * expressSurcharge;
  const canPlace = !blocked && Boolean(selectedId) && !isPending && undeliverable.length === 0;

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
      const result = await placeOrderAction({
        addressId: selectedId,
        giftWrap,
        wrapStyle: giftWrap ? wrapStyle : undefined,
        giftMessage,
        idempotencyKey,
        expressVendorIds: Array.from(expressVendors),
      });
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
          <h2 id="delivery-heading" className="flex items-center gap-3 font-heading text-2xl text-brand-dark">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary font-sans text-sm font-semibold text-brand-on-secondary">1</span>Delivery address
          </h2>
          <div className="mt-3">
            <AddressBook addresses={addresses} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          {selectedId && (deliveryChecking || deliveryLines.length > 0) ? (
            <ul className="mt-3 space-y-2 text-sm" aria-live="polite">
              {deliveryChecking && deliveryLines.length === 0 ? <li className="text-brand-dark/50">Checking delivery…</li> : null}
              {deliveryLines.map((line) => (
                <li key={line.key} className={line.bad ? "font-medium text-red-700" : "text-brand-dark/60"}>
                  {line.text}
                  {line.express ? (
                    <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label={`Delivery speed for ${line.express.vendorName}`}>
                      <label className={cn("flex cursor-pointer items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs transition-colors duration-200", !expressVendors.has(line.express.vendorId) ? "border-brand-secondary bg-brand-accent/60 font-medium text-brand-dark" : "border-brand-dark/15 text-brand-dark/60 hover:border-brand-dark/30")}>
                        <input type="radio" name={`speed-${line.express.vendorId}`} className="sr-only" checked={!expressVendors.has(line.express.vendorId)} onChange={() => toggleExpress(line.express!.vendorId, false)} />
                        Standard — {line.express.standardEtdDays ?? line.express.etdDays} {(line.express.standardEtdDays ?? line.express.etdDays) === 1 ? "day" : "days"}
                      </label>
                      <label className={cn("flex cursor-pointer items-center gap-1.5 rounded-button border px-3 py-1.5 text-xs transition-colors duration-200", expressVendors.has(line.express.vendorId) ? "border-brand-secondary bg-brand-accent/60 font-medium text-brand-dark" : "border-brand-dark/15 text-brand-dark/60 hover:border-brand-dark/30")}>
                        <input type="radio" name={`speed-${line.express.vendorId}`} className="sr-only" checked={expressVendors.has(line.express.vendorId)} onChange={() => toggleExpress(line.express!.vendorId, true)} />
                        Express — {line.express.expressEtdDays} {line.express.expressEtdDays === 1 ? "day" : "days"} (+{formatCurrency(expressSurcharge)})
                      </label>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="gift-heading">
          <h2 id="gift-heading" className="flex items-center gap-3 font-heading text-2xl text-brand-dark">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary font-sans text-sm font-semibold text-brand-on-secondary">2</span>Make it a gift
          </h2>
          <div className="mt-4 space-y-5 rounded-card border border-brand-secondary/25 bg-brand-accent/40 p-5">
            <label className={`flex cursor-pointer items-start gap-3 rounded-button border bg-brand-surface p-4 text-sm transition-all duration-300 ${giftWrap ? "border-brand-secondary shadow-card" : "border-brand-dark/10 hover:border-brand-secondary/50"}`}>
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
            {giftWrap ? (
              <fieldset className="rounded-button border border-brand-dark/10 bg-brand-surface p-4">
                <legend className="px-1 text-sm font-medium text-brand-dark">Choose your wrapping</legend>
                <div className="mt-2 grid grid-cols-5 gap-2 sm:gap-3">
                  {WRAP_STYLES.map((w) => {
                    const img = siteImage(w.imageKey);
                    const on = wrapStyle === w.id;
                    return (
                      <label key={w.id} className={cn("group relative flex cursor-pointer flex-col items-center gap-1 rounded-button border p-1.5 text-center transition-all duration-300", on ? "border-brand-secondary bg-brand-accent/60 shadow-card" : "border-transparent hover:border-brand-dark/15")}>
                        <input type="radio" name="wrapStyle" value={w.id} checked={on} onChange={() => setWrapStyle(w.id)} className="peer sr-only" />
                        <span className="relative block aspect-square w-full overflow-hidden rounded-button peer-focus-visible:ring-2 peer-focus-visible:ring-brand-secondary">
                          {img ? <Image src={img.src} alt="" fill sizes="96px" className="object-contain transition-transform duration-500 group-hover:scale-105" /> : <Gift className="m-auto h-full w-1/2 text-brand-secondary" aria-hidden="true" />}
                        </span>
                        <span className="text-[11px] leading-tight text-brand-dark/80 sm:text-xs">{w.label}</span>
                        {on ? <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-secondary text-brand-on-secondary"><Check className="h-3 w-3" aria-hidden="true" /></span> : null}
                      </label>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-brand-dark/60">{WRAP_STYLES.find((w) => w.id === wrapStyle)?.detail}. The wrapping fee is the same for every style.</p>
                {/* The picked wrap with the card tucked in — the message below shows on it as it's typed, addressed to the chosen delivery address's first name. */}
                <WrapPreview className="mt-4" wrapStyle={wrapStyle} message={giftMessage} recipient={(addresses.find((a) => a.id === selectedId)?.recipient_name ?? "").trim().split(/\s+/)[0] ?? ""} />
              </fieldset>
            ) : null}
            <div>
              <div className="mb-1 flex items-end justify-between">
                <label htmlFor="giftMessage" className="text-sm font-medium text-brand-dark">
                  Gift message (optional)
                </label>
                <span className="text-xs text-brand-dark/50" aria-live="polite">{giftMessage.length}/250</span>
              </div>
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
          <h2 id="items-heading" className="flex items-center gap-3 font-heading text-2xl text-brand-dark">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-secondary font-sans text-sm font-semibold text-brand-on-secondary">3</span>Review items
          </h2>
          <div className="mt-3">{itemsSlot}</div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-card border border-brand-dark/[0.06] bg-brand-surface p-6 shadow-lift lg:sticky lg:top-32">
        <h2 className="font-heading text-xl text-brand-dark">Order summary</h2>

        {quote.couponCode ? (
          <div className="flex items-center justify-between rounded-button bg-brand-primary/5 px-3 py-2 text-sm">
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
          <Row
            label="Delivery"
            value={(() => {
              const delivery = quote.delivery + expressVendors.size * expressSurcharge;
              return delivery === 0 ? "Free" : formatCurrency(delivery);
            })()}
          />
          {giftWrap ? <Row label={`Gift wrapping · ${wrapStyleLabel(wrapStyle) ?? ""}`.replace(/ · $/, "")} value={formatCurrency(giftWrapCharge)} /> : null}
          <div className="flex justify-between border-t border-brand-dark/10 pt-3 font-heading text-lg text-brand-dark">
            <dt>Total</dt>
            <dd>{formatCurrency(total)}</dd>
          </div>
          <p className="text-xs text-brand-dark/50">Includes {formatCurrency(quote.gstTotal)} GST. Free delivery per vendor over {formatCurrency(freeDeliveryThreshold)}.</p>
        </dl>

        {blocked ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{blocked}</p> : null}
        {error ? <p className="rounded-lg bg-red-50 p-3 text-xs text-red-800">{error}</p> : null}
        {!selectedId && !blocked ? <p className="text-xs text-brand-dark/60">Add a delivery address to continue.</p> : null}

        <Button size="lg" className="w-full" disabled={!canPlace} onClick={placeOrder}>
          {isPending ? "Placing your order…" : "Continue to payment"}
        </Button>
        <p className="text-center text-xs text-brand-dark/50">You won&apos;t be charged yet — you pay on the next step, and final amounts are confirmed by us.</p>
        <BuyAssurances returnDays={returnDays} />
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

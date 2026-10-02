"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cake, Gift, Heart, HeartHandshake, Minus, Plus, ShoppingBag, Sparkles, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DeliveryChecker } from "@/components/shop/DeliveryChecker";
import { ADD_TO_CART_FLY_EVENT, type AddToCartFlyDetail } from "@/components/motion/CartFlyLayer";
import { canShowMiniBasket } from "@/lib/shop/mini-basket-env";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { addToCartAction } from "@/lib/commerce/cart-actions";
import { effectiveStock, maxPurchasable } from "@/lib/commerce/pricing";
import { GiftCardPreview } from "@/components/shop/GiftCardPreview";
import { PERSONALIZATION_OCCASIONS as OCCASIONS } from "@/lib/commerce/personalization";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

export interface ProductVariant {
  id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
  is_active: boolean;
}

const OCCASION_ICONS: Record<string, LucideIcon> = { Birthday: Cake, Anniversary: Heart, "Thank You": HeartHandshake, Other: Sparkles };

export function ProductBuyBox({
  productId,
  productSlug,
  productName,
  imageUrl,
  basePrice,
  salePrice,
  stockQuantity,
  variants,
}: {
  productId: string;
  /** with the name and photo, the header's mini-basket can show what was just added immediately */
  productSlug?: string;
  productName?: string;
  imageUrl?: string | null;
  basePrice: number;
  salePrice: number | null;
  stockQuantity: number;
  variants: ProductVariant[];
}) {
  const variantGroups = useMemo(() => {
    const groups = new Map<string, ProductVariant[]>();
    for (const variant of variants) {
      if (!variant.is_active) continue;
      const group = groups.get(variant.name) ?? [];
      group.push(variant);
      groups.set(variant.name, group);
    }
    return Array.from(groups.entries());
  }, [variants]);

  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(variantGroups.map(([name, options]) => [name, options[0]?.id ?? ""])),
  );
  const [quantity, setQuantity] = useState(1);
  const [occasion, setOccasion] = useState<string>("");
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const selectedVariants = variantGroups
    .map(([name, options]) => options.find((o) => o.id === selected[name]))
    .filter((v): v is ProductVariant => Boolean(v));

  const priceAdjustment = selectedVariants.reduce((sum, v) => sum + v.price_adjustment, 0);
  const activePrice = (salePrice ?? basePrice) + priceAdjustment;
  // A gift can only sell as many units as the scarcest thing it depends on (the product and each chosen option).
  const availableStock = effectiveStock(
    stockQuantity,
    selectedVariants.map((v) => v.stock_quantity),
  );
  const inStock = availableStock > 0;
  const maxQuantity = Math.max(1, maxPurchasable(availableStock));

  function addToCart(afterAdd?: () => void, flyFrom?: { x: number; y: number }) {
    startTransition(async () => {
      const result = await addToCartAction({
        productId,
        variantIds: selectedVariants.map((v) => v.id),
        quantity: Math.min(quantity, maxQuantity),
        personalization: {
          recipientName,
          giftMessage,
          occasion: occasion ? (occasion as (typeof OCCASIONS)[number]) : undefined,
        },
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      // Let the robin do its "into the basket" moment before anything else reacts — see CartFlyLayer.
      if (flyFrom) {
        const detail: AddToCartFlyDetail = {
          ...flyFrom,
          ...(productSlug && productName ? { added: { slug: productSlug, name: productName, imageUrl: imageUrl ?? null, quantity: Math.min(quantity, maxQuantity), unitPrice: activePrice } } : {}),
        };
        window.dispatchEvent(new CustomEvent(ADD_TO_CART_FLY_EVENT, { detail }));
      }
      if (afterAdd) {
        afterAdd();
        return;
      }
      // With a real mouse on a desktop screen the header's mini-basket opens by itself and shows the gift landing — a toast on top would just repeat it.
      // Everywhere else (touch, narrow screens) the toast stays the confirmation.
      if (!flyFrom || !canShowMiniBasket()) {
        toast.success(result.message ?? "Added to your cart.", {
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      }
      router.refresh();
    });
  }

  const discountPercent = salePrice !== null && salePrice < basePrice ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-heading text-4xl text-brand-dark">{formatCurrency(activePrice)}</span>
          {discountPercent > 0 ? (
            <>
              <span className="text-lg text-brand-dark/40 line-through">{formatCurrency(basePrice + priceAdjustment)}</span>
              <span className="rounded-full bg-brand-secondary px-2.5 py-0.5 text-xs font-semibold text-brand-on-secondary">{discountPercent}% off</span>
            </>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-brand-dark/50">Inclusive of all taxes</p>
        {!inStock ? (
          <p className="mt-2 text-sm font-medium text-red-600">Out of stock</p>
        ) : availableStock <= 5 ? (
          <p className="mt-2 text-sm font-medium text-brand-secondary-dark">Only {availableStock} left</p>
        ) : null}
      </div>

      {variantGroups.map(([name, options]) => (
        <div key={name}>
          <Label>{name}</Label>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected((prev) => ({ ...prev, [name]: option.id }))}
                aria-pressed={selected[name] === option.id}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-all duration-300",
                  selected[name] === option.id
                    ? "border-brand-primary bg-brand-primary text-brand-on-primary shadow-card"
                    : "border-brand-dark/15 bg-brand-surface text-brand-dark hover:border-brand-primary/40",
                )}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <section className="rounded-card border border-brand-secondary/25 bg-brand-accent/40 p-5" aria-labelledby="personalise-heading">
        <h3 id="personalise-heading" className="flex items-center gap-2 font-heading text-lg text-brand-dark">
          <Gift className="h-5 w-5 text-brand-secondary" aria-hidden="true" /> Personalise your gift
        </h3>
        <p className="mt-0.5 text-xs text-brand-dark/60">Optional — a name and a note make it feel handpicked.</p>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="recipientName">Recipient&apos;s name</Label>
            <Input id="recipientName" placeholder="Who is it for?" maxLength={60} value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div>
            <div className="flex items-end justify-between">
              <Label htmlFor="giftMessage">A personal note</Label>
              <span className="mb-1.5 text-xs text-brand-dark/50" aria-live="polite">{giftMessage.length}/150</span>
            </div>
            <Textarea id="giftMessage" placeholder="Write something from the heart…" maxLength={150} value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} />
            <GiftCardPreview recipient={recipientName} message={giftMessage} className="mt-4" />
          </div>
          <div>
            <Label>Occasion</Label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => {
                const Icon = OCCASION_ICONS[o] ?? Sparkles;
                const on = occasion === o;
                return (
                  <button
                    key={o}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setOccasion((current) => (current === o ? "" : o))}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-medium transition-all duration-300",
                      on ? "border-brand-primary bg-brand-primary text-brand-on-primary shadow-card" : "border-brand-dark/15 bg-brand-surface text-brand-dark hover:border-brand-primary/40",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {o}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-brand-dark/15 bg-brand-surface">
          <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} disabled={quantity <= 1} className="rounded-full p-3 text-brand-dark/70 transition-colors hover:text-brand-dark disabled:opacity-30" aria-label="Decrease quantity">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-8 text-center text-sm font-medium" aria-live="polite">{Math.min(quantity, maxQuantity)}</span>
          <button type="button" onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))} disabled={quantity >= maxQuantity} className="rounded-full p-3 text-brand-dark/70 transition-colors hover:text-brand-dark disabled:opacity-30" aria-label="Increase quantity">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <Button
          className="flex-1"
          size="lg"
          disabled={!inStock || isPending}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            addToCart(undefined, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }}
        >
          <ShoppingBag className="h-4 w-4" />
          Add to cart
        </Button>
      </div>
      <Button
        variant="gold"
        size="lg"
        className="w-full"
        disabled={!inStock || isPending}
        // "Buy now" adds the item and opens the cart, where checkout starts.
        onClick={() => addToCart(() => router.push("/cart"))}
      >
        <Zap className="h-4 w-4" />
        Buy now
      </Button>

      <DeliveryChecker productId={productId} />
    </div>
  );
}

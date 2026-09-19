"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { addToCartAction } from "@/lib/commerce/cart-actions";
import { effectiveStock, maxPurchasable } from "@/lib/commerce/pricing";
import { PERSONALIZATION_OCCASIONS as OCCASIONS } from "@/lib/validation/cart.schema";
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


export function ProductBuyBox({
  productId,
  basePrice,
  salePrice,
  stockQuantity,
  variants,
}: {
  productId: string;
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

  function addToCart(afterAdd?: () => void) {
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
      if (afterAdd) {
        afterAdd();
        return;
      }
      toast.success(result.message ?? "Added to your cart.", {
        action: { label: "View cart", onClick: () => router.push("/cart") },
      });
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-baseline gap-2">
        <span className="font-heading text-3xl text-brand-dark">{formatCurrency(activePrice)}</span>
        {salePrice !== null && salePrice < basePrice ? (
          <span className="text-brand-dark/40 line-through">{formatCurrency(basePrice + priceAdjustment)}</span>
        ) : null}
      </div>

      {!inStock ? (
        <p className="text-sm font-medium text-red-600">Out of Stock</p>
      ) : availableStock <= 5 ? (
        <p className="text-sm font-medium text-brand-secondary-dark">Only {availableStock} left</p>
      ) : null}

      {variantGroups.map(([name, options]) => (
        <div key={name}>
          <Label>{name}</Label>
          <div className="flex flex-wrap gap-2">
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected((prev) => ({ ...prev, [name]: option.id }))}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  selected[name] === option.id
                    ? "border-brand-primary bg-brand-primary text-brand-light"
                    : "border-brand-dark/15 text-brand-dark hover:border-brand-primary/40",
                )}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-2xl border border-brand-dark/10 p-4">
        <h3 className="font-heading text-sm text-brand-dark">Personalise Your Gift</h3>
        <div className="mt-3 space-y-3">
          <div>
            <Label htmlFor="recipientName">Recipient&apos;s Name</Label>
            <Input
              id="recipientName"
              placeholder="Enter name"
              maxLength={60}
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="giftMessage">Add a Personal Note</Label>
            <Textarea
              id="giftMessage"
              placeholder="Write your message here..."
              maxLength={150}
              value={giftMessage}
              onChange={(e) => setGiftMessage(e.target.value)}
            />
          </div>
          <div>
            <Label>Occasion</Label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOccasion((current) => (current === o ? "" : o))}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs transition-colors",
                    occasion === o
                      ? "border-brand-primary bg-brand-primary text-brand-light"
                      : "border-brand-dark/15 text-brand-dark hover:border-brand-primary/40",
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-brand-dark/15">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-brand-dark/70"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="w-6 text-center text-sm">{Math.min(quantity, maxQuantity)}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
            className="px-3 py-2 text-brand-dark/70"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button className="flex-1" disabled={!inStock || isPending} onClick={() => addToCart()}>
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>
      <Button
        variant="secondary"
        className="w-full"
        disabled={!inStock || isPending}
        // Checkout arrives in Stage 6; until then "Buy Now" adds the item and opens the cart.
        onClick={() => addToCart(() => router.push("/cart"))}
      >
        <Zap className="h-4 w-4" />
        Buy Now
      </Button>
    </div>
  );
}

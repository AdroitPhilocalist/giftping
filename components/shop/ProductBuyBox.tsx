"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea, Input, Label } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
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

const OCCASIONS = ["Birthday", "Anniversary", "Thank You", "Other"];

export function ProductBuyBox({
  basePrice,
  salePrice,
  stockQuantity,
  variants,
}: {
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

  const selectedVariants = variantGroups
    .map(([name, options]) => options.find((o) => o.id === selected[name]))
    .filter((v): v is ProductVariant => Boolean(v));

  const priceAdjustment = selectedVariants.reduce((sum, v) => sum + v.price_adjustment, 0);
  const activePrice = (salePrice ?? basePrice) + priceAdjustment;
  const inStock = stockQuantity > 0;

  function handleStub(action: string) {
    toast(`${action} is coming in a later stage — the cart isn't built yet.`);
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
      ) : stockQuantity <= 5 ? (
        <p className="text-sm font-medium text-brand-secondary-dark">Only {stockQuantity} left</p>
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
            <Input id="recipientName" placeholder="Enter name" />
          </div>
          <div>
            <Label htmlFor="giftMessage">Add a Personal Note</Label>
            <Textarea id="giftMessage" placeholder="Write your message here..." maxLength={150} />
          </div>
          <div>
            <Label>Occasion</Label>
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOccasion(o)}
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
          <span className="w-6 text-center text-sm">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(stockQuantity || 1, q + 1))}
            className="px-3 py-2 text-brand-dark/70"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
        <Button className="flex-1" disabled={!inStock} onClick={() => handleStub("Add to Cart")}>
          <ShoppingBag className="h-4 w-4" />
          Add to Cart
        </Button>
      </div>
      <Button
        variant="secondary"
        className="w-full"
        disabled={!inStock}
        onClick={() => handleStub("Buy Now")}
      >
        <Zap className="h-4 w-4" />
        Buy Now
      </Button>
    </div>
  );
}

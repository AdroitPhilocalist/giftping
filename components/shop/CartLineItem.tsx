"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { ProductImage } from "@/components/shop/ProductImage";
import { toast } from "@/components/ui/Toast";
import { removeCartItemAction, updateCartQuantityAction } from "@/lib/commerce/cart-actions";
import type { CartLine } from "@/lib/commerce/cart";
import { formatCurrency } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

const STATUS_NOTE: Record<Exclude<CartLine["status"], "ok">, (line: CartLine) => string> = {
  unavailable: () => "This item is no longer available. Remove it to continue.",
  out_of_stock: () => "Out of stock right now. Remove it, or check back later.",
  limited: (line) => `Only ${line.maxQuantity} available — lower the quantity to continue.`,
};

export function CartLineItem({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();
  const purchasable = line.status === "ok" || line.status === "limited";

  function change(quantity: number) {
    startTransition(async () => {
      const result = await updateCartQuantityAction(line.id, quantity);
      if (result.error) toast.error(result.error);
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeCartItemAction(line.id);
      if (result.error) toast.error(result.error);
    });
  }

  const { engraving, recipientName, giftMessage, occasion } = line.personalization;

  return (
    <li className={cn("flex gap-4 py-5", isPending && "opacity-60")}>
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-button border border-brand-dark/10 shadow-sm sm:h-28 sm:w-28">
        <ProductImage src={line.imageUrl} alt={line.name} className="h-full w-full" sizes="112px" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.slug ? (
              <Link href={`/products/${line.slug}`} className="font-heading text-base text-brand-dark hover:underline">
                {line.name}
              </Link>
            ) : (
              <span className="font-heading text-base text-brand-dark/60">{line.name}</span>
            )}
            {line.variantLabels.length > 0 ? (
              <p className="mt-0.5 text-xs text-brand-dark/60">{line.variantLabels.join(" · ")}</p>
            ) : null}
            {engraving || recipientName || giftMessage || occasion ? (
              <div className="mt-1 space-y-0.5 text-xs text-brand-dark/60">
                {engraving ? <p className="font-medium text-brand-secondary-dark">Engraving: “{engraving}”</p> : null}
                {recipientName ? <p>For: {recipientName}</p> : null}
                {occasion ? <p>Occasion: {occasion}</p> : null}
                {giftMessage ? <p className="italic">“{giftMessage}”</p> : null}
              </div>
            ) : null}
          </div>
          <p
            className={cn(
              "shrink-0 font-heading text-base text-brand-dark",
              line.status !== "ok" && "text-brand-dark/40 line-through",
            )}
          >
            {formatCurrency(line.lineTotal)}
          </p>
        </div>

        {line.status !== "ok" ? (
          <p className="mt-2 text-xs font-medium text-red-700">{STATUS_NOTE[line.status](line)}</p>
        ) : null}
        {line.priceChanged ? (
          <p className="mt-2 text-xs font-medium text-brand-secondary-dark">
            Price updated from {formatCurrency(line.priceWhenAdded)} to {formatCurrency(line.unitPrice)} each.
          </p>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          {purchasable ? (
            <div className="flex items-center rounded-full border border-brand-dark/15 bg-brand-surface">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={isPending || line.quantity <= 1}
                onClick={() => change(line.quantity - 1)}
                className="rounded-full px-3 py-2 text-brand-dark/70 transition-colors hover:text-brand-dark disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-7 text-center text-sm" aria-live="polite">
                {line.quantity}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={isPending || line.quantity >= line.maxQuantity}
                onClick={() => change(line.quantity + 1)}
                className="rounded-full px-3 py-2 text-brand-dark/70 transition-colors hover:text-brand-dark disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={remove}
            disabled={isPending}
            className="flex items-center gap-1 text-xs text-brand-dark/50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
        {line.status === "ok" && line.quantity > 1 ? (
          <p className="mt-1 text-xs text-brand-dark/40">{formatCurrency(line.unitPrice)} each</p>
        ) : null}
      </div>
    </li>
  );
}

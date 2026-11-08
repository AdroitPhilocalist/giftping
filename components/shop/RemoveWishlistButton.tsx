"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "@/lib/shop/wishlist-actions";
import { toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";

/**
 * Remove a saved item even when its product is hidden (in review, inactive, or its boutique is suspended). The existing
 * WishlistButton is a heart toggle for product cards; this is the labelled action on an unavailable wishlist card, where
 * there is no product page to navigate to and the heart alone would be easy to miss.
 */
export function RemoveWishlistButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="mt-3 text-brand-secondary-dark hover:bg-brand-secondary/10"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          const result = await toggleWishlistAction(productId);
          if (result.error) {
            toast(result.error);
            return;
          }
          toast("Removed from your wishlist.");
          router.refresh();
        });
      }}
    >
      {isPending ? "Removing…" : "Remove"}
    </Button>
  );
}

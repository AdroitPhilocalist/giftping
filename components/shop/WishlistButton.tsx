"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toggleWishlistAction } from "@/lib/shop/wishlist-actions";
import { toast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

export function WishlistButton({
  productId,
  initialWishlisted,
  className,
}: {
  productId: string;
  initialWishlisted: boolean;
  className?: string;
}) {
  const [wishlisted, setWishlisted] = useState(initialWishlisted);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    const optimisticNext = !wishlisted;
    setWishlisted(optimisticNext);

    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (result.error) {
        setWishlisted(!optimisticNext);
        if (result.error.includes("Sign in")) {
          toast(result.error);
          router.push("/sign-in");
        } else {
          toast(result.error);
        }
        return;
      }
      setWishlisted(result.wishlisted);
      // Re-render the current route (and the header/mobile tab bar, which carry the saved count) so the badge and any
      // wishlist view stay in step immediately after adding or removing a gift.
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full bg-brand-surface/90 text-brand-dark/60 shadow-sm backdrop-blur transition-colors hover:text-red-500 disabled:opacity-60",
        className,
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", wishlisted && "fill-red-500 text-red-500")} />
    </button>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "@/components/ui/Toast";
import { toggleWishlistAction } from "@/lib/shop/wishlist-actions";
import { cn } from "@/lib/utils/cn";
import { useDiaryMode } from "./DiaryMode";

/** The little heart on a gift idea: adds it to the shopper's wishlist (the same action as everywhere else), styled for the paper. */
export function DiaryHeart({ productId, initial, className }: { productId: string; initial: boolean; className?: string }) {
  const { preview, signInHref } = useDiaryMode();
  if (preview) return <PreviewHeart signInHref={signInHref} className={className} />;
  return <DiaryHeartLive productId={productId} initial={initial} className={className} />;
}

/** In the sample diary the heart can't save anything, so it asks for an account instead of firing a doomed action. */
function PreviewHeart({ signInHref, className }: { signInHref: string; className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(event) => { event.preventDefault(); event.stopPropagation(); router.push(signInHref); }}
      aria-label="Sign in to save to your wishlist"
      title="Sign in to save to your wishlist"
      className={cn("dy-heart-btn", className)}
    >
      <Heart className="h-4 w-4" />
    </button>
  );
}

function DiaryHeartLive({ productId, initial, className }: { productId: string; initial: boolean; className?: string }) {
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function click(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    const next = !on;
    setOn(next);
    startTransition(async () => {
      const result = await toggleWishlistAction(productId);
      if (result.error) {
        setOn(!next);
        toast(result.error);
        if (result.error.includes("Sign in")) router.push("/sign-in");
        return;
      }
      setOn(result.wishlisted);
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      aria-pressed={on}
      aria-label={on ? "Remove from wishlist" : "Save to wishlist"}
      className={cn("dy-heart-btn", className)}
    >
      <Heart className={cn("h-4 w-4", on && "fill-current")} />
    </button>
  );
}

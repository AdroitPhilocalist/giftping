import { HeartOff } from "lucide-react";
import { RemoveWishlistButton } from "@/components/shop/RemoveWishlistButton";

/**
 * A saved gift whose product is not visible to shoppers right now — most often because a vendor edit sent it back to
 * admin review, but also when the vendor hid it or their boutique was suspended. It stays on the wishlist so the customer
 * can see that it was not lost and can remove it, instead of the page silently showing one fewer item.
 */
export function UnavailableWishlistCard({ productId }: { productId: string }) {
  return (
    <article className="flex h-full flex-col items-center justify-center rounded-card border border-dashed border-brand-dark/15 bg-brand-surface/70 p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-accent text-brand-secondary-dark">
        <HeartOff className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 font-heading text-base text-brand-dark">Temporarily unavailable</p>
      <p className="mt-1 text-xs leading-relaxed text-brand-dark/55">
        This saved gift isn&apos;t available right now. It will reappear here if it becomes live again.
      </p>
      <RemoveWishlistButton productId={productId} />
    </article>
  );
}

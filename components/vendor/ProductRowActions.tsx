"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit, Eye, EyeOff, Send } from "lucide-react";
import { setProductActiveAction } from "@/lib/vendor/actions";
import { Button } from "@/components/ui/Button";
import { toast } from "@/components/ui/Toast";
import Link from "next/link";

export function ProductRowActions({ productId, status }: { productId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isHidden = status === "inactive" || status === "rejected";
  const isLive = status === "approved" || status === "active";
  const isPendingReview = status === "pending";

  function toggle() {
    startTransition(async () => {
      const result = await setProductActiveAction(productId, isHidden);
      if (result.error) {
        toast(result.error);
        return;
      }
      toast(isHidden ? "Sent for review — it'll go live once approved." : "Product hidden from the mall.");
      router.refresh();
    });
  }

  // Still in review — only editing is allowed
  if (isPendingReview) {
    return (
      <Link href={`/vendor/products/${productId}`} className="flex items-center gap-1.5" aria-label="Edit product">
        <Button variant="ghost" size="sm" asChild>
          <span className="flex items-center gap-1.5">
            <Edit className="h-4 w-4" aria-hidden="true" />
            Edit
          </span>
        </Button>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLive ? (
        <>
          {/* Hide — muted red, destructive-feeling, clearly says "make this disappear" */}
          <Button
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={toggle}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
            aria-label="Hide product from storefront"
          >
            <EyeOff className="h-4 w-4" aria-hidden="true" />
            Hide
          </Button>

          {/* Edit — secondary outline, the neutral "change details" action */}
          <Link href={`/vendor/products/${productId}`} className="flex items-center gap-1.5" aria-label="Edit product">
            <Button variant="secondary" size="sm" asChild>
              <span className="flex items-center gap-1.5">
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit
              </span>
            </Button>
          </Link>

          {/* View on storefront — quiet ghost, lets the vendor see how it looks live */}
          <Link href={`/products/${productId}`} className="flex items-center gap-1.5" aria-label="View product on storefront">
            <Button variant="ghost" size="sm" asChild>
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" aria-hidden="true" />
                View
              </span>
            </Button>
          </Link>
        </>
      ) : (
        <>
          {/* Resubmit — primary green fill, the clear positive next step */}
          <Button
            variant="primary"
            size="sm"
            disabled={isPending}
            onClick={toggle}
            aria-label="Resubmit product for review"
          >
            <span className="flex items-center gap-1.5">
              <Send className="h-4 w-4" aria-hidden="true" />
              {status === "rejected" ? "Resubmit" : "Resubmit for review"}
            </span>
          </Button>

          {/* Edit — secondary outline, fix details before resubmitting */}
          <Link href={`/vendor/products/${productId}`} className="flex items-center gap-1.5" aria-label="Edit product">
            <Button variant="secondary" size="sm" asChild>
              <span className="flex items-center gap-1.5">
                <Edit className="h-4 w-4" aria-hidden="true" />
                Edit
              </span>
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}

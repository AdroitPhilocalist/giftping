import { Star, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface ReviewData {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  is_verified_purchase: boolean;
  vendor_response: string | null;
  created_at: string;
  reviewer_display_name: string | null;
}

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "fill-brand-secondary text-brand-secondary" : "text-brand-dark/15"}`}
        />
      ))}
    </div>
  );
}

export function ReviewList({ reviews, total }: { reviews: ReviewData[]; total: number }) {
  if (total === 0) {
    return <p className="text-sm text-brand-dark/50">No reviews yet — be the first to share your experience.</p>;
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border-b border-brand-dark/10 pb-6 last:border-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stars rating={review.rating} />
              {review.is_verified_purchase ? (
                <Badge variant="primary" className="gap-1">
                  <BadgeCheck className="h-3 w-3" /> Verified Purchase
                </Badge>
              ) : null}
            </div>
            <span className="text-xs text-brand-dark/40">
              {new Date(review.created_at).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          {review.title ? <p className="mt-2 font-medium text-brand-dark">{review.title}</p> : null}
          {review.body ? <p className="mt-1 text-sm text-brand-dark/70">{review.body}</p> : null}
          <p className="mt-2 text-xs text-brand-dark/50">{review.reviewer_display_name ?? "GiftPing Customer"}</p>
          {review.vendor_response ? (
            <div className="mt-3 rounded-xl bg-brand-accent/40 p-3">
              <p className="text-xs font-semibold text-brand-dark">Response from the vendor</p>
              <p className="mt-1 text-sm text-brand-dark/70">{review.vendor_response}</p>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

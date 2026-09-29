import Link from "next/link";
import { Star } from "lucide-react";
import { DeleteReviewButton, EditReviewButton } from "@/components/shop/ReviewDialogs";
import { ProductImage } from "@/components/shop/ProductImage";
import { requireRole } from "@/lib/auth/session";
import { getUserReviews } from "@/lib/db/reviews";

export const metadata = { title: "My Reviews — GiftPing" };

export default async function MyReviewsPage() {
  const user = await requireRole("customer", "vendor", "admin");
  const reviews = await getUserReviews(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link href="/account" className="text-sm text-brand-dark/60 hover:underline">
        ← My Account
      </Link>
      <h1 className="mt-2 font-heading text-3xl text-brand-dark">My Reviews</h1>
      <p className="mt-1 text-sm text-brand-dark/60">Everything you&apos;ve written, and a place to change your mind.</p>

      {reviews.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-brand-dark/15 p-12 text-center text-brand-dark/50">
          You haven&apos;t written a review yet — you can write one from a delivered order.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {reviews.map((review) => {
            const product = Array.isArray(review.product) ? review.product[0] : review.product;
            return (
              <li key={review.id} className="rounded-card border border-brand-dark/10 bg-brand-surface p-4 shadow-card">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-brand-dark/10">
                    <ProductImage src={product?.thumbnail_url ?? null} alt={product?.name ?? "Product"} className="h-full w-full" sizes="56px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {product ? (
                      <Link href={`/products/${product.slug}`} className="font-medium text-brand-dark hover:underline">{product.name}</Link>
                    ) : (
                      <p className="font-medium text-brand-dark/50">This product is no longer available</p>
                    )}
                    <div className="mt-1 flex items-center gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={n <= review.rating ? "h-4 w-4 fill-brand-secondary text-brand-secondary" : "h-4 w-4 fill-transparent text-brand-dark/20"} />
                      ))}
                      <span className="ml-2 text-xs text-brand-dark/40">
                        {new Date(review.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {review.updated_at !== review.created_at ? " (edited)" : ""}
                      </span>
                    </div>
                    {review.title ? <p className="mt-2 font-medium text-brand-dark">{review.title}</p> : null}
                    <p className="mt-1 text-sm text-brand-dark/70">{review.body}</p>
                  </div>
                </div>
                {product ? (
                  <div className="mt-3 flex items-center gap-4 border-t border-dashed border-brand-dark/10 pt-3">
                    <EditReviewButton reviewId={review.id} productName={product.name} rating={review.rating} title={review.title} body={review.body ?? ""} />
                    <DeleteReviewButton reviewId={review.id} />
                  </div>
                ) : (
                  <div className="mt-3 border-t border-dashed border-brand-dark/10 pt-3">
                    <DeleteReviewButton reviewId={review.id} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { checkRateLimit, reviewRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import { createClient } from "@/lib/db/server";
import { reviewSchema, type ReviewInput } from "@/lib/validation/review.schema";

export interface ReviewActionResult {
  error?: string;
}

async function gate() {
  const user = await getServerUser();
  if (!user) return { error: "Please sign in." } as const;
  if (!(await checkRateLimit(reviewRateLimit, `${user.id}:${await getRequestIp()}`)).success) {
    return { error: "Please wait a moment and try again." } as const;
  }
  return { user } as const;
}

const uuid = z.string().uuid();

/**
 * Written from a delivered order item ("Write a review"). Upserts on (product_id, user_id) — the unique
 * constraint reviews_product_user_unique means submitting again for a product you've already reviewed
 * updates that same review instead of creating a duplicate, so this one action covers both "first review"
 * and "review this again after a repeat purchase" without needing separate code paths. is_verified_purchase
 * and reviewer_display_name are never set here — the DB triggers derive both from real data.
 */
export async function submitReviewAction(productId: string, orderItemId: string | null, raw: ReviewInput): Promise<ReviewActionResult> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  if (!uuid.safeParse(productId).success) return { error: "Invalid product." };
  if (orderItemId !== null && !uuid.safeParse(orderItemId).success) return { error: "Invalid order." };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your review." };

  const { error } = await (await createClient())
    .from("reviews")
    .upsert(
      { product_id: productId, user_id: g.user.id, order_item_id: orderItemId, rating: parsed.data.rating, title: parsed.data.title, body: parsed.data.body },
      { onConflict: "product_id,user_id" },
    );
  if (error) return { error: "Couldn't save your review. Please try again." };

  revalidatePath("/account/reviews");
  revalidatePath("/orders");
  return {};
}

/** Editing an existing review from /account/reviews. Only rating/title/body change — RLS
 * (reviews_update_own_or_product_vendor_or_admin) plus the .eq("user_id", ...) below both scope this to
 * the caller's own review; the enforce_review_update_scope trigger leaves an owner's own update unrestricted. */
export async function editReviewAction(reviewId: string, raw: ReviewInput): Promise<ReviewActionResult> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  if (!uuid.safeParse(reviewId).success) return { error: "Invalid review." };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your review." };

  const { error } = await (await createClient())
    .from("reviews")
    .update({ rating: parsed.data.rating, title: parsed.data.title, body: parsed.data.body })
    .eq("id", reviewId)
    .eq("user_id", g.user.id);
  if (error) return { error: "Couldn't save your changes. Please try again." };

  revalidatePath("/account/reviews");
  return {};
}

export async function deleteReviewAction(reviewId: string): Promise<ReviewActionResult> {
  const g = await gate();
  if ("error" in g) return { error: g.error };
  if (!uuid.safeParse(reviewId).success) return { error: "Invalid review." };

  const { error } = await (await createClient()).from("reviews").delete().eq("id", reviewId).eq("user_id", g.user.id);
  if (error) return { error: "Couldn't delete your review. Please try again." };

  revalidatePath("/account/reviews");
  revalidatePath("/orders");
  return {};
}

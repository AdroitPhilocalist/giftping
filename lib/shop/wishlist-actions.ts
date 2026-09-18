"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/db/server";
import { getServerUser } from "@/lib/auth/session";

export interface WishlistToggleResult {
  wishlisted: boolean;
  error?: string;
}

export async function toggleWishlistAction(productId: string): Promise<WishlistToggleResult> {
  const user = await getServerUser();
  if (!user) {
    return { wishlisted: false, error: "Sign in to save items to your wishlist." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("wishlists")
    .select("id")
    .eq("user_id", user.id)
    .eq("product_id", productId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("wishlists").delete().eq("id", existing.id);
    if (error) return { wishlisted: true, error: "Couldn't update your wishlist." };
    revalidatePath("/wishlist");
    return { wishlisted: false };
  }

  const { error } = await supabase.from("wishlists").insert({ user_id: user.id, product_id: productId });
  if (error) return { wishlisted: false, error: "Couldn't update your wishlist." };
  revalidatePath("/wishlist");
  return { wishlisted: true };
}

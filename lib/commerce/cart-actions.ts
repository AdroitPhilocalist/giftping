"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cartRateLimit, checkRateLimit } from "@/lib/auth/rate-limit";
import { getRequestIp } from "@/lib/auth/request-ip";
import { getServerUser } from "@/lib/auth/session";
import {
  addItemToCart,
  mergeGuestCartIntoUser,
  removeLine,
  setLineQuantity,
  type CartMutationResult,
} from "@/lib/commerce/cart";
import { addToCartSchema, quantitySchema, type AddToCartInput } from "@/lib/validation/cart.schema";

const TOO_MANY = "You're doing that a little fast — please wait a moment.";

async function limited(): Promise<boolean> {
  const result = await checkRateLimit(cartRateLimit, await getRequestIp());
  return !result.success;
}

// The whole layout re-renders so the navbar badge stays correct.
function refresh() {
  revalidatePath("/", "layout");
}

export async function addToCartAction(raw: AddToCartInput): Promise<CartMutationResult> {
  if (await limited()) return { error: TOO_MANY };
  const parsed = addToCartSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check your selection." };

  const result = await addItemToCart(parsed.data);
  if (!result.error) refresh();
  return result;
}

const lineIdSchema = z.string().uuid();

export async function updateCartQuantityAction(lineId: string, quantity: number): Promise<CartMutationResult> {
  if (await limited()) return { error: TOO_MANY };
  const id = lineIdSchema.safeParse(lineId);
  const qty = quantitySchema.safeParse(quantity);
  if (!id.success || !qty.success) return { error: "Invalid quantity." };

  const result = await setLineQuantity(id.data, qty.data);
  if (!result.error) refresh();
  return result;
}

export async function removeCartItemAction(lineId: string): Promise<CartMutationResult> {
  if (await limited()) return { error: TOO_MANY };
  const id = lineIdSchema.safeParse(lineId);
  if (!id.success) return { error: "Invalid item." };

  const result = await removeLine(id.data);
  if (!result.error) refresh();
  return result;
}

/** Called by the cart page when a signed-in shopper still carries a guest cookie (e.g. after a password reset). */
export async function mergeGuestCartAction(): Promise<void> {
  const user = await getServerUser();
  if (!user) return;
  await mergeGuestCartIntoUser(user.id);
  refresh();
}

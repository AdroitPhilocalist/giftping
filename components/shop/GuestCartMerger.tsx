"use client";

import { useEffect, useRef } from "react";
import { mergeGuestCartAction } from "@/lib/commerce/cart-actions";

/**
 * Sign-in / sign-up / Google callback all merge the guest cart themselves. This is the safety net for the
 * remaining ways to end up signed in with a guest cookie (e.g. a password-reset link): the cart page renders
 * it, it merges once, and the action's revalidation refreshes the page.
 */
export function GuestCartMerger() {
  const ran = useRef(false);
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void mergeGuestCartAction();
  }, []);
  return null;
}

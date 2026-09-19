import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const GUEST_CART_COOKIE = "gp_cart";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
// 32 random bytes, base64url => exactly 43 chars. Anything else in the cookie is rejected before it
// gets near a query.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function readGuestCartToken(): Promise<string | null> {
  const value = (await cookies()).get(GUEST_CART_COOKIE)?.value;
  return value && TOKEN_PATTERN.test(value) ? value : null;
}

/** Only callable from a Server Action / Route Handler (cookies are read-only during render). */
export async function issueGuestCartToken(): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  (await cookies()).set(GUEST_CART_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return token;
}

export async function clearGuestCartToken(): Promise<void> {
  (await cookies()).delete(GUEST_CART_COOKIE);
}

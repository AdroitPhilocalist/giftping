import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed, stateless unsubscribe tokens: `<userId>.<signature>`. The signature is an HMAC-SHA256 of the user id under a server
 * secret, so a link can't be forged for someone else's id, and nothing needs to be stored or looked up to honour it.
 *
 * Deliberately NO expiry: a person must be able to unsubscribe from an old email years later (and many mail apps cache links), so a
 * token that "expires" would turn a legal right into a dead end. The secret is MARKETING_UNSUBSCRIBE_SECRET; rotating it
 * invalidates every email already sent, so it should be set once and kept.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sign = (userId: string, secret: string) => createHmac("sha256", secret).update(`marketing-unsubscribe:v1:${userId.toLowerCase()}`).digest("base64url");

export function signUnsubscribeToken(userId: string, secret: string): string {
  if (!UUID.test(userId)) throw new Error("userId must be a UUID");
  if (!secret) throw new Error("An unsubscribe secret is required");
  return `${userId.toLowerCase()}.${sign(userId, secret)}`;
}

/** The user id the token was issued for, or null if it is malformed or the signature doesn't match. Constant-time compare. */
export function verifyUnsubscribeToken(token: string | null | undefined, secret: string): string | null {
  if (!token || !secret || token.length > 200) return null;
  const dot = token.indexOf(".");
  if (dot !== 36) return null;
  const userId = token.slice(0, dot);
  if (!UUID.test(userId)) return null;
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(userId, secret));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return userId.toLowerCase();
}

/** Secrets shorter than this are refused outright — a guessable secret makes the tokens forgeable. */
export const MIN_SECRET_LENGTH = 24;
export function usableSecret(value: string | undefined | null): string | null {
  const v = (value ?? "").trim();
  return v.length >= MIN_SECRET_LENGTH ? v : null;
}

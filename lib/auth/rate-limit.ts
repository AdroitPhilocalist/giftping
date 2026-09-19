import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// Free-tier Upstash Redis comfortably covers this project's rate-limit volume (see
// CLAUDE.md's cost constraint). If it's ever not configured (e.g. a fresh local clone
// before .env.local is filled in), limiters no-op rather than blocking all requests —
// fail open in dev, never fail closed on a missing dev credential.
function createLimiter(requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) return null;
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  });
}

// Per CLAUDE.md's SRS-derived security requirements: auth routes 5/min per IP, payment
// routes 10/min, search 60/min.
export const authRateLimit = createLimiter(5, "1 m");
export const paymentRateLimit = createLimiter(10, "1 m");
export const searchRateLimit = createLimiter(60, "1 m");
export const uploadRateLimit = createLimiter(20, "1 m");
// Cart writes (add/update/remove/merge). Guests can create carts, so this also bounds cart-row spam per IP.
export const cartRateLimit = createLimiter(60, "1 m");
// Checkout: applying coupons (guessing codes) and placing orders.
export const checkoutRateLimit = createLimiter(15, "1 m");

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RateLimitResult> {
  if (!limiter) {
    return { success: true, remaining: Infinity, reset: 0 };
  }
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining, reset: result.reset };
}

/** Best-effort client IP extraction behind Vercel's proxy. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

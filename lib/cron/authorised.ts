import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

/** Vercel Cron calls with `Authorization: Bearer $CRON_SECRET`. Constant-time, length-blind compare; an unset secret validates nothing (so an unconfigured deploy can't be triggered by anyone). */
export function cronAuthorised(header: string | null): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = createHash("sha256").update(header.slice(7)).digest();
  const b = createHash("sha256").update(secret).digest();
  return timingSafeEqual(a, b);
}

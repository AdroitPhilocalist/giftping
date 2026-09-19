import "server-only";
import { headers } from "next/headers";

// Server Actions/Server Components don't receive a Request object, only next/headers() — this is the
// counterpart to rate-limit.ts's getClientIp(request), which is for Route Handlers.
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headerList.get("x-real-ip") ?? "unknown";
}

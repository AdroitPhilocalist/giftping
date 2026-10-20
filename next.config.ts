import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

// next/image only optimizes remote images from hosts listed here. Vendor photos live in Supabase Storage
// (public bucket), so allow exactly this project's storage path — not the whole *.supabase.co domain.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }]
      : [],
    dangerouslyAllowLocalIP: true,
    // AVIF first (smaller than WebP for photographic art), falling back to WebP for browsers that don't
    // support it — Next negotiates by the request's Accept header, so every visitor still gets a working
    // image either way. Already covered by the Vercel Pro image-optimization allowance (see CLAUDE.md).
    formats: ["image/avif", "image/webp"],
  },
  // PERCEIVED SPEED. Every page here is dynamically rendered (the root layout reads cookies + a per-request CSP
  // nonce), so Next's client router cache no longer keeps visited pages at all — the 15.x default `dynamic: 0`
  // means a back/forward or a re-visit re-runs the full server render from scratch. A short window makes those
  // instant; mutations stay correct because every Server Action/route that changes data already calls
  // revalidatePath (which evicts the cached segment). `static` covers anything Next is able to prerender.
  // Tune down if a page ever shows an update more slowly than expected; see the Next docs' `staleTimes` page.
  experimental: {
    staleTimes: { dynamic: 30, static: 180 },
  },
  // Baseline hardening headers on every response — Next/Vercel don't set any of these on their own (Vercel's
  // own HSTS only covers a verified custom domain, not these). The Content-Security-Policy lives in proxy.ts
  // instead, not here: it's a per-request nonce (Next's own recommended pattern), and only middleware can mint
  // a fresh one per request. See docs/progress/2026-09-28-csp.md for what it allows and how it was tested live.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nothing may embed this site in a frame (clickjacking / UI-redress protection). This app itself embeds
          // Razorpay's checkout iframe — that's a different direction and unaffected by this header.
          { key: "X-Frame-Options", value: "DENY" },
          // Stops the browser guessing a response's content-type from its bytes (e.g. treating an uploaded "image"
          // as executable script) — relevant given vendor/customer file uploads (product photos, diary photos).
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends the full referrer only to our own origin; other sites just see the scheme+host, not the path
          // (which can carry a search query, an order id, a diary link) — reduces incidental data leakage on outbound links.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Off by default for browser features this site never uses; nothing here needs loosening for Razorpay/Sentry/OneSignal.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self \"https://api.razorpay.com\")" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // No org/project/authToken set yet — source map upload is skipped until Stage 13
  // (go-live) when SENTRY_AUTH_TOKEN is provided; error capture still works without it.
});

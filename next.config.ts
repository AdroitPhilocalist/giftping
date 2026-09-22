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
    // AVIF first (smaller than WebP for photographic art), falling back to WebP for browsers that don't
    // support it — Next negotiates by the request's Accept header, so every visitor still gets a working
    // image either way. Already covered by the Vercel Pro image-optimization allowance (see CLAUDE.md).
    formats: ["image/avif", "image/webp"],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // No org/project/authToken set yet — source map upload is skipped until Stage 13
  // (go-live) when SENTRY_AUTH_TOKEN is provided; error capture still works without it.
});

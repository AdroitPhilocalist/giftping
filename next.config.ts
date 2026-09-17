import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  silent: true,
  // No org/project/authToken set yet — source map upload is skipped until Stage 13
  // (go-live) when SENTRY_AUTH_TOKEN is provided; error capture still works without it.
});

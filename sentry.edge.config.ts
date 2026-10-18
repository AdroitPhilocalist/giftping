import * as Sentry from "@sentry/nextjs";
import { TRACES_SAMPLE_RATE } from "@/lib/observability/sentry";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // See lib/observability/sentry.ts — traces only; errors are never sampled by this.
  tracesSampleRate: TRACES_SAMPLE_RATE,
  enabled: process.env.NODE_ENV === "production",
});

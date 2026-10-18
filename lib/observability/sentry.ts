/**
 * Sentry performance-tracing sample rate — one number, three runtimes.
 *
 * `tracesSampleRate` is the FRACTION OF REQUESTS THAT GET A PERFORMANCE TRACE. `1.0` traces every single
 * request; `0.1` traces one in ten. It governs traces only: **error capture is not sampled by it**, so
 * lowering this does not mean losing error reports. (Sentry's error quota and its performance quota are
 * separate pools.)
 *
 * Why this was lowered from 1.0:
 *   1. Quota. At 100% a busy day can exhaust the month's performance allowance, and traces then stop —
 *      usually right when they are wanted.
 *   2. Work per request. Every traced request builds, serialises and flushes a trace. That cost is paid on
 *      the server, at the edge (i.e. on every middleware invocation) and in the visitor's browser, on a
 *      site where every navigation is already a fresh server render because no route is static.
 *
 * 0.1 keeps p50/p95 statistically meaningful while cutting trace volume by ~90%. Raise it temporarily when
 * investigating one specific slow path, then put it back.
 *
 * It lives here rather than as a literal in each config so the three runtimes cannot drift apart — a
 * browser tracing every request while the server traces one in ten is a very hard thing to notice.
 * Consumed by `sentry.server.config.ts`, `sentry.edge.config.ts` and `instrumentation-client.ts`.
 */
export const TRACES_SAMPLE_RATE = 0.1;

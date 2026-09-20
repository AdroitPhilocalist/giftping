/**
 * Interprets OneSignal's create-notification response. Pure, and pinned by tests to responses captured from the REAL API:
 *   - delivered to >=1 subscriber:  200 { id: "<uuid>", ... }
 *   - user exists but has no subscribed device: **200** { id: "", errors: ["All included players are not subscribed"] }
 *     (a 200! — checking only the status code would count this as "sent")
 *   - wrong key: 401 { errors: ["Access denied. …"] }
 */
export type PushOutcome = "sent" | "not_subscribed" | "failed";

export function interpretOneSignalResponse(status: number, json: unknown): PushOutcome {
  const body = (json ?? {}) as { id?: unknown; errors?: unknown };
  const errorText = JSON.stringify(body.errors ?? "").toLowerCase();

  if (status >= 200 && status < 300 && typeof body.id === "string" && body.id.length > 0) return "sent";
  // "not subscribed" (200 with an empty id) and "no such external id" (400 invalid_aliases) both just mean: nobody to notify.
  if (errorText.includes("not subscribed") || errorText.includes("invalid_aliases") || errorText.includes("no subscribed")) return "not_subscribed";
  return "failed";
}

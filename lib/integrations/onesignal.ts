import "server-only";
import { interpretOneSignalResponse, type PushOutcome } from "./onesignal-response";

/**
 * OneSignal web push (REST, plain fetch). Users are addressed by `external_id` = their GiftPing user id, which the browser
 * links with `OneSignal.login(userId)` after sign-in (components/shop/OneSignalIdentity.tsx). The REST API key stays server-side.
 * Without both env vars this is a no-op that says so — nothing in dev ever throws or pretends to have sent.
 */
export function isOneSignalConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
}

export type SendPushResult = PushOutcome | "not_configured";

export async function sendPush(args: { userId: string; title: string; message: string; url: string }): Promise<SendPushResult> {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const key = process.env.ONESIGNAL_REST_API_KEY;
  if (!appId || !key) return "not_configured";

  try {
    const response = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_aliases: { external_id: [args.userId] },
        headings: { en: args.title.slice(0, 80) },
        contents: { en: args.message.slice(0, 200) },
        url: args.url,
        ttl: 60 * 60 * 24, // a stale reminder is worse than none
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = await response.json().catch(() => null);
    const outcome = interpretOneSignalResponse(response.status, json);
    if (outcome === "failed") console.error("OneSignal push failed", response.status, JSON.stringify(json)?.slice(0, 300));
    return outcome;
  } catch (error) {
    console.error("OneSignal push failed", error);
    return "failed";
  }
}

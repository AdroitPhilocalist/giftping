import "server-only";

/**
 * Minimal Resend client (plain fetch — no SDK). Without RESEND_API_KEY it is a no-op that says so, so nothing in dev ever
 * throws or pretends to have sent. NOTE: until the sending domain is verified in Resend, only `onboarding@resend.dev` may be
 * used as the From address, and only to the account owner's own email; set RESEND_FROM_EMAIL accordingly while testing.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/** `notConfigured` = no key, or Resend is still in test mode (unverified domain): skip quietly, don't treat as a failure. */
export type SendResult = { ok: true; id: string | null } | { ok: false; error: string; notConfigured?: boolean };

const fromAddress = () => (process.env.RESEND_FROM_EMAIL ? `GiftPing <${process.env.RESEND_FROM_EMAIL}>` : "GiftPing <onboarding@resend.dev>");
const isTestModeRefusal = (status: number, message: string | undefined) => status === 403 && /verify a domain|only send testing emails/i.test(message ?? "");

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** extra headers, e.g. List-Unsubscribe for marketing mail */
  headers?: Record<string, string>;
}

export async function sendEmail(args: OutgoingEmail): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Resend is not configured", notConfigured: true };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress(),
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
        ...(args.headers ? { headers: args.headers } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    // Resend refuses every recipient but the account owner's until a sending domain is verified. That's a known "not ready yet" state,
    // not a fault: report it like "not configured" so callers skip quietly instead of logging an error per message.
    if (isTestModeRefusal(response.status, json?.message)) {
      return { ok: false, error: json?.message ?? "Resend is in test mode", notConfigured: true };
    }
    if (!response.ok) return { ok: false, error: json?.message ?? `Resend returned ${response.status}` };
    return { ok: true, id: json?.id ?? null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

/**
 * `quota` = the provider says we're out of its daily/monthly allowance (HTTP 429). That's not a fault in any one email: the
 * caller should stop for now and leave everything queued, not mark people as failed.
 */
export type BatchResult =
  | { ok: true; ids: (string | null)[] }
  | { ok: false; error: string; notConfigured?: boolean; quota?: boolean };

/**
 * Up to 100 emails in ONE API call (Resend's batch endpoint). Besides being far faster than 100 calls, it keeps a campaign well inside
 * the free tier's 2-requests-per-second limit. Batches are all-or-nothing on the provider's side (it validates every email first), so a
 * failure here means none of this batch was sent. Unlike sendEmail, a response that arrives but can't be read is reported as a failure
 * with no ids — the caller must treat that batch as "possibly sent" and NOT blindly retry (see lib/marketing/sender.ts).
 */
export async function sendEmailBatch(emails: OutgoingEmail[]): Promise<BatchResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Resend is not configured", notConfigured: true };
  if (emails.length === 0) return { ok: true, ids: [] };
  if (emails.length > 100) return { ok: false, error: "A batch holds at most 100 emails" };

  try {
    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(
        emails.map((e) => ({ from: fromAddress(), to: [e.to], subject: e.subject, html: e.html, text: e.text, ...(e.headers ? { headers: e.headers } : {}) })),
      ),
      signal: AbortSignal.timeout(30_000),
    });
    const json = (await response.json().catch(() => null)) as { data?: { id?: string }[]; message?: string } | null;
    if (isTestModeRefusal(response.status, json?.message)) return { ok: false, error: json?.message ?? "Resend is in test mode", notConfigured: true };
    if (response.status === 429) return { ok: false, error: json?.message ?? "Resend rate or quota limit reached", quota: true };
    if (!response.ok) return { ok: false, error: json?.message ?? `Resend returned ${response.status}` };
    const ids = (json?.data ?? []).map((d) => d.id ?? null);
    return { ok: true, ids: emails.map((_, i) => ids[i] ?? null) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

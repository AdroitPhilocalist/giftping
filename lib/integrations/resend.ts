import "server-only";

/**
 * Minimal Resend client (plain fetch — no SDK). Without RESEND_API_KEY it is a no-op that says so, so nothing in dev ever
 * throws or pretends to have sent. NOTE: until the sending domain is verified in Resend, only `onboarding@resend.dev` may be
 * used as the From address, and only to the account owner's own email; set RESEND_FROM_EMAIL accordingly while testing.
 */
export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string; notConfigured?: boolean };

export async function sendEmail(args: { to: string; subject: string; html: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "Resend is not configured", notConfigured: true };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ? `GiftPing <${process.env.RESEND_FROM_EMAIL}>` : "GiftPing <onboarding@resend.dev>",
        to: [args.to],
        subject: args.subject,
        html: args.html,
        text: args.text,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
    if (!response.ok) return { ok: false, error: json?.message ?? `Resend returned ${response.status}` };
    return { ok: true, id: json?.id ?? null };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

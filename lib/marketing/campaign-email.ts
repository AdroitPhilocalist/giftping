import { escapeHtml, renderEmailFrame, safeUrl, type BuiltEmail } from "../notifications/email-layout";

/**
 * The marketing email, as a pure function. The admin writes PLAIN TEXT (blank line = new paragraph); it is escaped here, so a
 * campaign can never inject markup, scripts or tracking pixels — the only link in the body is the admin-set button, which must be a
 * site path or https URL (checked on save and again by `safeUrl` here).
 *
 * Every email carries what a lawful marketing email needs: who it's from, why the person is getting it, and a working
 * one-click way out — both as a visible link and as the List-Unsubscribe headers mail apps show as an "Unsubscribe" button.
 */
export interface CampaignEmailInput {
  /** null when the person has no usable name */
  firstName: string | null;
  subject: string;
  preheader: string | null;
  body: string;
  cta: { label: string; url: string } | null;
  /** confirm page (GET) shown when someone clicks the link in the email */
  unsubscribeUrl: string;
  /** the account settings page where the same switch lives */
  preferencesUrl: string;
  /** a one-line address/contact for the footer, when known */
  senderLine: string | null;
}

const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export function bodyToParagraphs(body: string): string[] {
  return body
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function buildCampaignEmail(i: CampaignEmailInput): BuiltEmail {
  const subject = oneLine(i.subject);
  const greeting = i.firstName ? `Hi ${i.firstName},` : "Hi there,";
  const paragraphs = bodyToParagraphs(i.body);
  const bodyHtml = [
    `<p style="margin:0 0 14px;color:#555">${escapeHtml(greeting)}</p>`,
    ...paragraphs.map((p) => `<p style="margin:0 0 14px;color:#333;line-height:1.55">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`),
  ].join("\n");

  const footerHtml = [
    `You're getting this because you chose to hear from GiftPing about offers and new arrivals.`,
    `<a href="${escapeHtml(safeUrl(i.unsubscribeUrl))}" style="color:#888">Unsubscribe</a> in one click, or <a href="${escapeHtml(safeUrl(i.preferencesUrl))}" style="color:#888">manage your email preferences</a>.`,
    i.senderLine ? escapeHtml(i.senderLine) : "",
  ]
    .filter(Boolean)
    .join("<br/>");

  const html = renderEmailFrame({
    preheader: i.preheader ? oneLine(i.preheader) : subject,
    heading: subject,
    bodyHtml,
    cta: i.cta ? { label: i.cta.label, url: i.cta.url } : undefined,
    footerHtml,
  });

  const text = [
    greeting,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    ...(i.cta ? [`${i.cta.label}: ${i.cta.url}`, ""] : []),
    "--",
    "You're getting this because you chose to hear from GiftPing about offers and new arrivals.",
    `Unsubscribe: ${i.unsubscribeUrl}`,
    `Email preferences: ${i.preferencesUrl}`,
    ...(i.senderLine ? [i.senderLine] : []),
  ].join("\n");

  return { subject, html, text };
}

/**
 * RFC 8058 one-click unsubscribe. Gmail and Yahoo require this for bulk senders; it makes the mail app show its own "Unsubscribe"
 * button, which POSTs to `oneClickUrl` with no further interaction. (The visible in-email link goes to a confirm page instead, so a
 * link-scanning mail filter that merely FETCHES the URL can't unsubscribe someone by accident — a GET never changes anything.)
 */
export function listUnsubscribeHeaders(oneClickUrl: string): Record<string, string> {
  return { "List-Unsubscribe": `<${oneClickUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" };
}

/**
 * One branded email frame for every transactional email, as pure functions. Everything interpolated is HTML-escaped here or by the
 * caller via `escapeHtml` — user-typed text (names, gift messages, addresses) never reaches markup unescaped.
 */
export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/** Only http(s) URLs may be linked: a `javascript:` URL in data must never become an href. */
export function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : "#";
}

export interface EmailFrame {
  preheader?: string;
  heading: string;
  /** Already-escaped HTML for the body. */
  bodyHtml: string;
  cta?: { label: string; url: string };
  footerHtml: string;
}

export function renderEmailFrame(f: EmailFrame): string {
  return `<!doctype html><html><body style="margin:0;background:#FAFAF8;font-family:Inter,Arial,sans-serif;color:#1A1A1A">
${f.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(f.preheader)}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1A4731;color:#F5ECD7;padding:18px 24px;font-family:Georgia,serif;font-size:20px">GiftPing</td></tr>
<tr><td style="padding:24px">
<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:22px;color:#1A4731">${escapeHtml(f.heading)}</h1>
${f.bodyHtml}
${f.cta ? `<p style="margin:24px 0 0"><a href="${escapeHtml(safeUrl(f.cta.url))}" style="display:inline-block;background:#1A4731;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">${escapeHtml(f.cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 24px;background:#FAFAF8;color:#888;font-size:12px">${f.footerHtml}</td></tr>
</table></td></tr></table></body></html>`;
}

export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

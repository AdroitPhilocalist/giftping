import { EVENT_TYPE_LABEL } from "../validation/diary.schema";

/**
 * The diary reminder email, as pure functions (subject + HTML + plain text). Everything a user typed — their contact's name,
 * a custom occasion title — is HTML-escaped before it goes into markup: a contact called `<script>` must not become a script
 * in an email, and one called `Priya & Sons` must not break the layout.
 */
export const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export interface ReminderEmailInput {
  recipientFirstName: string;
  contactName: string;
  eventType: string;
  eventTitle: string | null;
  daysBefore: number;
  /** ISO date of the occasion */
  occurrence: string;
  milestoneYears: number;
  suggestions: { name: string; priceLabel: string; url: string; reason: string }[];
  diaryUrl: string;
  preferencesUrl: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0]}`;

export function occasionLabel(input: Pick<ReminderEmailInput, "contactName" | "eventType" | "eventTitle" | "milestoneYears">): string {
  const base = input.eventTitle ?? EVENT_TYPE_LABEL[input.eventType as keyof typeof EVENT_TYPE_LABEL] ?? input.eventType;
  if (input.eventTitle) return `${input.contactName}'s ${input.eventTitle}`;
  if (input.eventType === "birthday") return `${input.contactName}'s ${input.milestoneYears > 0 ? `${ordinal(input.milestoneYears)} ` : ""}birthday`;
  if (input.eventType === "anniversary") return `${input.contactName}'s ${input.milestoneYears > 0 ? `${ordinal(input.milestoneYears)} ` : ""}anniversary`;
  return `${input.contactName}'s ${base.toLowerCase()}`;
}

export function buildReminderEmail(input: ReminderEmailInput): { subject: string; html: string; text: string } {
  const label = occasionLabel(input);
  const when = input.daysBefore === 1 ? "tomorrow" : `in ${input.daysBefore} days`;
  const subject = `${label} is ${when}${input.suggestions.length ? ` — ${input.suggestions.length} gift idea${input.suggestions.length === 1 ? "" : "s"}` : ""}`;

  const ideasHtml = input.suggestions
    .map(
      (s) => `<tr><td style="padding:12px 0;border-top:1px solid #eee">
        <a href="${escapeHtml(s.url)}" style="color:#1A4731;font-weight:600;text-decoration:none">${escapeHtml(s.name)}</a>
        <span style="color:#555"> · ${escapeHtml(s.priceLabel)}</span><br/>
        <span style="color:#777;font-size:13px">${escapeHtml(s.reason)}</span></td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html><body style="margin:0;background:#FAFAF8;font-family:Inter,Arial,sans-serif;color:#1A1A1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:16px;overflow:hidden">
<tr><td style="background:#1A4731;color:#F5ECD7;padding:18px 24px;font-family:Georgia,serif;font-size:20px">GiftPing</td></tr>
<tr><td style="padding:24px">
<p style="margin:0 0 4px;color:#777">Hi ${escapeHtml(input.recipientFirstName)},</p>
<h1 style="margin:0 0 8px;font-family:Georgia,serif;font-size:22px;color:#1A4731">${escapeHtml(label)} is ${when}</h1>
<p style="margin:0 0 16px;color:#555">${escapeHtml(prettyDate(input.occurrence))} — there's still time to choose something they'll love.</p>
${input.suggestions.length ? `<p style="margin:16px 0 4px;font-weight:600">Gift ideas picked for ${escapeHtml(input.contactName)}</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ideasHtml}</table>` : ""}
<p style="margin:24px 0 0"><a href="${escapeHtml(input.diaryUrl)}" style="display:inline-block;background:#1A4731;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">Open your gifting diary</a></p>
</td></tr>
<tr><td style="padding:16px 24px;background:#FAFAF8;color:#888;font-size:12px">You're getting this because you saved this date in your GiftPing diary.
<a href="${escapeHtml(input.preferencesUrl)}" style="color:#888">Change your reminder settings</a>.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `Hi ${input.recipientFirstName},`,
    "",
    `${label} is ${when} (${prettyDate(input.occurrence)}).`,
    ...(input.suggestions.length ? ["", `Gift ideas for ${input.contactName}:`, ...input.suggestions.map((s) => `- ${s.name} (${s.priceLabel}) — ${s.reason}\n  ${s.url}`)] : []),
    "",
    `Open your diary: ${input.diaryUrl}`,
    `Reminder settings: ${input.preferencesUrl}`,
  ].join("\n");

  return { subject, html, text };
}

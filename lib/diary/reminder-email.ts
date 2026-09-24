import { EVENT_TYPE_LABEL } from "../validation/diary.schema";

/**
 * The diary reminder email, as pure functions (subject + HTML + plain text). Everything a user typed — their contact's name,
 * a custom occasion title — is HTML-escaped before it goes into markup: a contact called `<script>` must not become a script
 * in an email, and one called `Priya & Sons` must not break the layout.
 *
 * The look follows the diary (ui-references/diary/09.png): a green header, a sheet of warm paper, the date on a ticket, what you gave last year, a few ideas.
 * Email clients are unforgiving, so it is tables, inline styles and system fonts — no web fonts, no CSS layout, one small `<style>` for the phone layout only —
 * and every picture is optional: with images off it still reads perfectly.
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
  suggestions: { name: string; priceLabel: string; url: string; reason: string; imageUrl?: string | null }[];
  /** what was given to this person around this occasion last year, if the diary knows */
  lastYear?: { giftName: string; imageUrl?: string | null } | null;
  diaryUrl: string;
  preferencesUrl: string;
  /** absolute URL of the small robin picture; omitted = no picture */
  robinUrl?: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const prettyDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${FULL_MONTHS[m - 1]} ${y}`;
};
const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][(n % 100 >> 3) ^ 1 && n % 10 < 4 ? n % 10 : 0]}`;

export function occasionLabel(input: Pick<ReminderEmailInput, "contactName" | "eventType" | "eventTitle" | "milestoneYears">): string {
  const base = input.eventTitle ?? EVENT_TYPE_LABEL[input.eventType as keyof typeof EVENT_TYPE_LABEL] ?? input.eventType;
  if (input.eventTitle) return `${input.contactName}'s ${input.eventTitle}`;
  if (input.eventType === "birthday") return `${input.contactName}'s ${input.milestoneYears > 0 ? `${ordinal(input.milestoneYears)} ` : ""}birthday`;
  if (input.eventType === "anniversary") return `${input.contactName}'s ${input.milestoneYears > 0 ? `${ordinal(input.milestoneYears)} ` : ""}anniversary`;
  return `${input.contactName}'s ${base.toLowerCase()}`;
}

/** One emoji per kind of occasion — every mail client draws these, no image needed. */
const OCCASION_EMOJI: Record<string, string> = { birthday: "🎂", anniversary: "💞", wedding: "💍", housewarming: "🏡", graduation: "🎓", festival: "🪔", "thank-you": "🌸", other: "🎁" };

// the diary's palette, as literal values (an email can't read the site's CSS variables)
const INK = "#1c1916";
const SOFT = "#6f5d4a";
const PAPER = "#fbf3e3";
const PAPER_DEEP = "#f4e6cd";
const EDGE = "#dcc7a3";
const GREEN = "#0c2a1d";
const COPPER = "#b75f22";
const BLUSH = "#f4c9bd";
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "'DM Sans','Helvetica Neue',Arial,sans-serif";

/** Only real web addresses go into an <img>/<a>: nothing else a user- or data-supplied string could smuggle in (javascript:, data:). */
const safeUrl = (value: string | null | undefined): string | null => (value && /^https?:\/\//i.test(value) ? value : null);

export function buildReminderEmail(input: ReminderEmailInput): { subject: string; html: string; text: string } {
  const label = occasionLabel(input);
  const when = input.daysBefore === 1 ? "tomorrow" : `in ${input.daysBefore} days`;
  const left = input.daysBefore === 1 ? "1 day left" : `${input.daysBefore} days left`;
  const subject = `${label} is ${when}${input.suggestions.length ? ` — ${input.suggestions.length} gift idea${input.suggestions.length === 1 ? "" : "s"}` : ""}`;
  const emoji = OCCASION_EMOJI[input.eventType] ?? OCCASION_EMOJI.other;
  const preheader = input.suggestions.length ? `A little nudge from your diary — ${input.suggestions.length} gift idea${input.suggestions.length === 1 ? "" : "s"} picked for ${input.contactName}.` : `A little nudge from your diary.`;

  const robin = safeUrl(input.robinUrl);
  const lastYear = input.lastYear && input.lastYear.giftName.trim() ? input.lastYear : null;
  const lastYearImg = safeUrl(lastYear?.imageUrl);

  const ideaCards = input.suggestions
    .slice(0, 3)
    .map((s) => {
      const img = safeUrl(s.imageUrl);
      const url = safeUrl(s.url) ?? "#";
      return `<td class="idea" width="33%" valign="top" style="padding:0 5px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fffaf0;border:1px solid ${EDGE};border-radius:6px">
          ${img ? `<tr><td style="padding:8px 8px 0"><a href="${escapeHtml(url)}"><img src="${escapeHtml(img)}" alt="${escapeHtml(s.name)}" width="100%" style="display:block;width:100%;height:auto;border-radius:3px;border:0"></a></td></tr>` : ""}
          <tr><td style="padding:10px 10px 4px;font-family:${SERIF};font-size:15px;line-height:1.25;font-weight:bold"><a href="${escapeHtml(url)}" style="color:${INK};text-decoration:none">${escapeHtml(s.name)}</a></td></tr>
          <tr><td style="padding:0 10px;font-family:${SANS};font-size:14px;font-weight:bold;color:${INK}">${escapeHtml(s.priceLabel)}</td></tr>
          <tr><td style="padding:2px 10px 8px;font-family:${SERIF};font-size:12px;font-style:italic;line-height:1.35;color:${SOFT}">${escapeHtml(s.reason)}</td></tr>
          <tr><td style="padding:0 10px 12px"><a href="${escapeHtml(url)}" style="display:inline-block;background:${COPPER};color:#fffaf4;font-family:${SANS};font-size:13px;font-weight:bold;text-decoration:none;padding:7px 16px;border-radius:999px">See it →</a></td></tr>
        </table></td>`;
    })
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<title>${escapeHtml(subject)}</title>
<style>@media only screen and (max-width:520px){.wrap{padding:0 !important}.idea{display:block !important;width:100% !important;padding:0 0 12px !important}.pad{padding-left:20px !important;padding-right:20px !important}.robin{display:none !important}}</style></head>
<body style="margin:0;padding:0;background:${PAPER_DEEP};font-family:${SANS};color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER_DEEP}"><tr><td align="center" class="wrap" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${PAPER};border:1px solid ${EDGE};border-radius:10px;overflow:hidden">
<tr><td style="background:${GREEN};padding:16px 28px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-family:${SERIF};font-size:24px;color:#f6ead4;letter-spacing:.3px">GiftPing</td>
    <td align="right" style="font-family:${SERIF};font-size:13px;font-style:italic;color:#d9b76b">Your Gifting Diary</td>
  </tr></table>
</td></tr>
<tr><td class="pad" style="padding:30px 32px 6px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td valign="top">
      <p style="margin:0;font-family:${SERIF};font-size:30px;font-style:italic;line-height:1.1;color:${INK}">Hi ${escapeHtml(input.recipientFirstName)},</p>
      <p style="margin:6px 0 0;font-family:${SERIF};font-size:18px;font-style:italic;color:${SOFT}">a little nudge from your diary…</p>
    </td>
    ${robin ? `<td class="robin" width="110" align="right" valign="top"><img src="${escapeHtml(robin)}" alt="" width="100" style="display:block;width:100px;height:auto;border:0"></td>` : ""}
  </tr></table>
</td></tr>
<tr><td class="pad" style="padding:14px 32px 4px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf6e6;border:1px dashed #c9a56a;border-radius:8px"><tr>
    <td width="64" align="center" valign="middle" style="padding:16px 0 16px 16px;font-size:38px;line-height:1">${emoji}</td>
    <td valign="middle" style="padding:16px 18px">
      <p style="margin:0;font-family:${SERIF};font-size:24px;font-weight:bold;line-height:1.15;color:${INK}">${escapeHtml(label)}</p>
      <p style="margin:4px 0 0;font-family:${SERIF};font-size:16px;color:${SOFT}">${escapeHtml(longDate(input.occurrence))}</p>
      <p style="margin:10px 0 0"><span style="display:inline-block;background:${BLUSH};font-family:${SERIF};font-size:17px;font-weight:bold;color:${INK};padding:3px 14px;border-radius:999px">${escapeHtml(left)}</span></p>
    </td>
  </tr></table>
</td></tr>
${lastYear ? `<tr><td class="pad" style="padding:14px 32px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td valign="middle" style="font-family:${SERIF};font-size:17px;font-style:italic;line-height:1.35;color:${INK}">🎁&nbsp; Last year you gave ${escapeHtml(input.contactName)} <strong style="font-style:normal">${escapeHtml(lastYear.giftName)}</strong>.</td>
    ${lastYearImg ? `<td width="76" align="right" valign="middle"><img src="${escapeHtml(lastYearImg)}" alt="" width="64" style="display:block;width:64px;height:auto;border:4px solid #fffaf0;border-radius:3px;box-shadow:0 1px 4px rgba(80,46,16,.3)"></td>` : ""}
  </tr></table>
</td></tr>` : ""}
${input.suggestions.length ? `<tr><td class="pad" style="padding:26px 32px 0">
  <p style="margin:0 0 12px;font-family:${SERIF};font-size:22px;font-style:italic;color:${INK}">Thoughtful gift ideas for ${escapeHtml(input.contactName)} <span style="color:${COPPER}">♡</span></p>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${ideaCards}</tr></table>
</td></tr>` : ""}
<tr><td class="pad" style="padding:26px 32px 8px" align="center">
  <a href="${escapeHtml(safeUrl(input.diaryUrl) ?? "#")}" style="display:inline-block;background:${GREEN};color:#f6ead4;font-family:${SERIF};font-size:18px;font-style:italic;text-decoration:none;padding:12px 30px;border-radius:999px">Open your diary →</a>
</td></tr>
<tr><td class="pad" style="padding:22px 32px 26px" align="center">
  <p style="margin:0;border-top:1px solid ${EDGE};padding-top:16px;font-family:${SERIF};font-size:15px;font-style:italic;color:${SOFT}">🔒 &nbsp;Only you can see this — <a href="${escapeHtml(safeUrl(input.preferencesUrl) ?? "#")}" style="color:${COPPER}">manage reminders</a></p>
  <p style="margin:8px 0 0;font-family:${SANS};font-size:11px;line-height:1.5;color:#9a8871">You're getting this because you saved this date in your GiftPing diary.</p>
</td></tr>
</table>
</td></tr></table></body></html>`;

  const text = [
    `Hi ${input.recipientFirstName},`,
    "",
    `${label} is ${when} (${prettyDate(input.occurrence)}).`,
    ...(lastYear ? ["", `Last year you gave ${input.contactName} ${lastYear.giftName}.`] : []),
    ...(input.suggestions.length ? ["", `Thoughtful gift ideas for ${input.contactName}:`, ...input.suggestions.map((s) => `- ${s.name} (${s.priceLabel}) — ${s.reason}\n  ${s.url}`)] : []),
    "",
    `Open your diary: ${input.diaryUrl}`,
    `Only you can see this. Reminder settings: ${input.preferencesUrl}`,
  ].join("\n");

  return { subject, html, text };
}

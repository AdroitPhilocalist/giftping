/**
 * The marketing-email consent wording, versioned. Whatever a person agreed to is recorded against `MARKETING_NOTICE_VERSION`
 * (marketing_consent_log.notice_version), so if this text ever changes materially the version MUST change too — that is what lets
 * GiftPing show later exactly what each person was told. Plain constants (no server imports) so forms and server code share them.
 *
 * Written to meet the DPDP Act 2023's tests for valid consent: given by a clear affirmative action (an unticked box / a switch the
 * person turns on), for ONE specified purpose, in plain language, separate from creating an account, and as easy to withdraw as to give.
 */
export const MARKETING_NOTICE_VERSION = "2026-10-v1";

export const MARKETING_CONSENT_LABEL = "Email me offers, new arrivals and gifting ideas from GiftPing.";

export const MARKETING_CONSENT_DETAIL =
  "Optional. We'll use your name and email address only to send these emails — we never use your Gifting Diary for marketing. You can unsubscribe any time with one click, here or from any email, and it won't affect your orders or account.";

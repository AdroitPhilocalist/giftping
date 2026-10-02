/** Facts about the business that pages state. Anything not known yet is null so a page can say so honestly instead of inventing it. */
export const SITE = {
  name: "GiftPing",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null,
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() || null,
  /** The business's postal address, shown in the footer of marketing emails when set. Null until the client provides it. */
  businessAddress: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim() || null,
  /**
   * The Privacy Policy, Terms and Refund Policy are plain-language drafts written from how the site actually behaves. While this is false each shows a
   * "draft" notice. Flip it to true only after the client's advisers have reviewed the text (Stage 13 go-live checklist).
   */
  legalReviewed: false,
} as const;

import type { ReactNode } from "react";

/**
 * The shape of a policy document, shared by the plain `LegalPage` (Privacy, Refunds, customer Terms) and the
 * `InstrumentPage` (vendor terms). Keeping it in one place means a policy can be moved between the two treatments without
 * touching its content.
 *
 * A paragraph is a plain string; a bullet list or a paragraph that needs a link inside it gets its own variant, so a policy
 * can point at another policy without the component having to guess at markup.
 */
export type LegalBody = string | { list: string[] } | { node: ReactNode };

export interface LegalSection {
  heading: string;
  body: LegalBody[];
}

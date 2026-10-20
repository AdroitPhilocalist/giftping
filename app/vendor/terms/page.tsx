import Link from "next/link";
import { BadgeCheck, ClipboardCheck, ReceiptText, Undo2 } from "lucide-react";
import { InstrumentPage } from "@/components/legal/InstrumentPage";
import { Button } from "@/components/ui/Button";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Vendor Terms — GiftPing",
  description: "The terms for selling on GiftPing: listings, commission, payouts, returns and pausing a boutique.",
};

/**
 * The seller-side terms, referred to by the application form's own checkbox ("I confirm these details are accurate and agree to
 * the GiftPing vendor terms and commission structure") and by the customer Terms & Conditions, which said boutiques "agree to our
 * seller terms" while no such page existed anywhere on the site.
 *
 * Rendered as an instrument (`components/legal/InstrumentPage.tsx`) rather than a plain article: paper, margin rule, numbered
 * clauses, a seal and — until `SITE.legalReviewed` is flipped — a DRAFT stamp. The wrapper is generic; only the words below are
 * vendor-specific.
 *
 * Written from how the platform actually behaves — every claim here is something the code does today:
 *
 *  - applications are reviewed before a boutique goes live and products start `pending` (`supabase/migrations/*.dml`, the
 *    vendors/products status defaults, and `sendBackToReviewIfLive()` — which sends a vendor's edit to a live listing back to review);
 *  - commission is deducted from the payout, never invoiced (`lib/commerce/totals.ts`);
 *  - a line becomes payable `payout_hold_days` after delivery, which is the returns window (`platform_settings`);
 *  - a refund shrinks that item's earnings in proportion, and a shortfall carries onto the next payout
 *    (`app/vendor/(portal)/returns/page.tsx`, `lib/admin/refunds.ts`);
 *  - a suspended boutique's products stop being purchasable (`lib/commerce/cart.ts`).
 *
 * Deliberately does NOT state a commission percentage: the rate is per-boutique (`resolveCommissionRate`) and the client has asked
 * that it not appear on public pages. The "at a glance" block restates four facts that appear in the clauses — it adds no claim
 * of its own.
 *
 * It is a public page on purpose: `VENDOR_PUBLIC_PATHS` in `lib/auth/paths.ts` keeps it out of the gated portal, because anyone
 * considering applying must be able to read it before they have an account. It is also deliberately absent from the sitemap —
 * `PRIVATE_PATHS` in `lib/seo/robots.ts` disallows everything under `/vendor/`, and the funnel is not meant to be indexed.
 */
export default function VendorTermsPage() {
  return (
    <InstrumentPage
      eyebrow="The small print"
      title={<>Vendor <span className="accent-word">terms</span></>}
      intro="What it means to sell on GiftPing, written so it can be understood on a first read."
      recordLabel="Vendor terms"
      updated="19 October 2026"
      facts={[
        { icon: BadgeCheck, label: "Free to apply", note: "Applying costs nothing, and so does listing a product." },
        { icon: ClipboardCheck, label: "Read before it's live", note: "Applications and new listings are checked by our team first." },
        { icon: ReceiptText, label: "Commission from the payout", note: "Taken out of each order you fulfil — never invoiced." },
        { icon: Undo2, label: "Refunds touch one item", note: "A refund never reduces the rest of what you're owed." },
      ]}
      sections={[
        {
          heading: "Becoming a vendor",
          body: [
            `Anyone with a ${SITE.name} account can apply to sell. Applications are read by our team before a boutique goes live, and we may decline one — most often because the details don't check out or the products aren't a fit for a gifting mall.`,
            "You can shop with the same account while you wait. Applying costs nothing.",
          ],
        },
        {
          heading: "Your boutique",
          body: [
            "Once you're approved we open your storefront: a name, a tagline, a brand story, and a banner and logo you upload. You're responsible for what your storefront says, and for having the right to use the pictures, names and trademarks you put on it.",
            "Your details are yours. Bank and tax details you give us are used to pay you and to bill correctly, and are never shown to shoppers.",
          ],
        },
        {
          heading: "Your products",
          body: [
            { list: [
              "Add products from your dashboard, one at a time or in bulk from a CSV file.",
              "New listings are reviewed by our team before they appear in the mall, and an edit to a live listing goes back for review too.",
              "Descriptions, prices, sizes, materials and stock must be accurate and honest. Please don't list something you can't supply.",
              "You must have the right to sell what you list, and to use the images you attach to it.",
            ] },
          ],
        },
        {
          heading: "Commission",
          body: [
            "We charge commission on each order you fulfil. It is taken out of the payout for that order — we don't invoice you for it, and nothing is charged when you list a product or when your boutique goes live.",
            "Commission is a percentage of the order's value. The rate that applies to your boutique is set by GiftPing when your application is approved, and it's applied each time we settle your orders. If you have a question about your rate, contact support — your commission and bank details are managed by us rather than edited from your dashboard.",
          ],
        },
        {
          heading: "Getting paid",
          body: [
            "Each order line becomes payable a set number of days after it is delivered. That hold covers the returns window, so you're not paid for something that is on its way back to you.",
            "Orders are settled in batches, and you can download a statement for each settlement from your payouts page. Delivery charges and gift wrapping are paid by the shopper, not deducted from your earnings.",
          ],
        },
        {
          heading: "Packing and couriers",
          body: [
            "You pack and hand over your own orders. We book the courier pickup from the address you give us, and share the tracking with the shopper, so your pickup address must be somewhere a courier can collect from during the day.",
            "Please pack to survive a journey. A parcel that arrives damaged is a refund we have to make, and that reduces the earnings on that item.",
          ],
        },
        {
          heading: "Returns and refunds",
          body: [
            "When a return or refund is approved, your earnings on that item shrink in the same proportion as the refund. If the item was already paid out to you, the difference comes off a later payout.",
            "Refunds only ever affect the item they were raised on — they never reduce the rest of what you're owed.",
          ],
        },
        {
          heading: "Taxes and paperwork",
          body: [
            "We ask for your GSTIN and PAN when you apply, and we may need to see them again if they change. You are responsible for your own tax registrations, filings and invoices; we handle the tax on the sale itself.",
          ],
        },
        {
          heading: "If we have to pause a boutique",
          body: [
            "We may pause a boutique — its products stop being available to buy — if it repeatedly falls short of these terms, if products turn out not to be as described, or if we're required to by law. We'll tell you why, and you can reply.",
            "Orders that were already paid for are looked after by our team. You can ask us to review a decision at any time.",
          ],
        },
        {
          heading: "Changes to these terms",
          body: [
            "We may update these terms as the mall grows. The date at the top shows the latest version, and the terms in force when an order was placed govern that order.",
          ],
        },
        {
          heading: "Questions",
          body: [
            {
              node: (
                <p>
                  If anything here is unclear, or you need something in writing before you apply, write to us through the{" "}
                  <Link href="/contact" className="font-medium text-brand-secondary-dark underline decoration-brand-secondary/40 underline-offset-4 hover:decoration-brand-secondary">
                    contact page
                  </Link>{" "}
                  and a person will answer.
                </p>
              ),
            },
          ],
        },
      ]}
      closing="Reading this page doesn't accept the terms — you'll be asked to agree when you apply."
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/vendor/register">Apply to sell</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/contact">Ask a question</Link>
          </Button>
        </>
      }
    />
  );
}

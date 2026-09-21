import { LegalPage } from "@/components/pages/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Terms & Conditions — GiftPing", description: "The terms for using GiftPing and buying from its boutiques." };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The small print"
      title="Terms & Conditions"
      intro="These are the ground rules for shopping at GiftPing, written so they can be understood on a first read."
      updated="21 September 2026"
      sections={[
        { heading: "Who we are", body: [`${SITE.name} is an online gifting marketplace. We sell our own “GiftPing Originals” directly, and independent boutiques sell their products through us. Each product page says who is selling it.`] },
        { heading: "Your account", body: ["You need an account to place an order or keep a diary. Please give accurate details and keep your password to yourself. You are responsible for activity on your account."] },
        { heading: "Prices and payment", body: [{ list: [
          "Prices are in Indian rupees and include GST. Delivery and optional gift wrapping are shown before you pay.",
          "The total you pay is calculated by us at checkout from the current catalogue; it can’t be changed from your browser.",
          "An order is confirmed only once your payment is received. Until then it is a saved draft and nothing has been charged.",
          "If an item sells out between paying and confirming, we refund you automatically.",
        ] }] },
        { heading: "Personalised gifts", body: ["Names and messages you add are printed or written as you typed them. Please check spelling before you order. Please keep messages lawful and kind — we and the boutiques may decline content that is abusive or unlawful."] },
        { heading: "Delivery", body: ["Each boutique ships its own items, so an order from more than one boutique may arrive in separate parcels on different days. Delivery estimates are estimates. You must be able to receive the parcel at the address you give."] },
        { heading: "Returns, cancellations and refunds", body: ["These are set out in our Refund Policy, which forms part of these terms."] },
        { heading: "Boutiques", body: ["Boutiques are independent sellers who agree to our seller terms and are responsible for their products, descriptions and packing. We review boutiques and products before they appear, and may suspend a boutique that does not meet our standards."] },
        { heading: "Acceptable use", body: ["Please don’t misuse the site: no attempts to break or overload it, to access other people’s accounts or data, or to place orders you do not intend to pay for."] },
        { heading: "Our responsibility", body: ["We take care to run the site well and to fix problems quickly, but we cannot promise it will always be available or error free. Nothing in these terms limits any right you have under Indian consumer law."] },
        { heading: "Changes", body: ["We may update these terms as the site grows. The date at the top shows the latest version; orders are governed by the terms in force when you placed them."] },
      ]}
    />
  );
}

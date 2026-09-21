import { LegalPage } from "@/components/pages/LegalPage";
import { SITE } from "@/lib/site";

export const metadata = { title: "Privacy Policy — GiftPing", description: "What GiftPing collects, why, who sees it, and the choices you have." };

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your privacy"
      title="Privacy Policy"
      intro="We keep this simple: we collect what we need to deliver your gifts and remind you of the moments you ask us to remember, and nothing more."
      updated="21 September 2026"
      sections={[
        { heading: "What we collect", body: ["Only what you give us or what your orders need:", { list: [
          "Account details — your name, email, and (if you add it) phone number.",
          "Delivery addresses and the recipient names and notes you add to gifts.",
          "Your orders, payments status, returns and refunds.",
          "Your wishlist, cart, and notification choices.",
          "Your Personal Gifting Diary — the people, dates and gift history you choose to save.",
        ] }, "We do not see or store your card or UPI details; payments are handled by our payment provider."] },
        { heading: "Your diary is private", body: ["The diary is yours alone. Our team, including administrators, cannot open your contacts, events or gift history — the system is built so that only the signed-in owner can read them. We are able to see an overall count (for example, how many people use the diary), never its contents.", "Diary reminders are sent to you by email and, if you allow it, as push notifications on your device."] },
        { heading: "Who else receives your information", body: ["Only the services needed to run your order:", { list: [
          "The boutique that sells the item, who receives the delivery name, address and phone number for the items they ship.",
          "Our courier partner, to collect and deliver your parcel.",
          "Our payment provider, to take payment and process refunds.",
          "Our email and push-notification providers, to send you the messages you have asked for.",
          "Our hosting and error-monitoring providers, who process technical data needed to keep the site running.",
        ] }, "We do not sell your personal information."] },
        { heading: "How long we keep it", body: ["Account and diary information is kept until you delete your account. Order, payment and tax records are kept for as long as the law requires for accounting, even after an account is deleted; when you delete your account we remove your name, contact details and free-text notes from those records."] },
        { heading: "Your choices", body: [{ list: [
          "Download a copy of your data from your account page.",
          "Correct your details, addresses and notification preferences at any time.",
          "Delete your account from your account page. Deletion is refused while a return or refund is still open, so that nothing you are owed is lost.",
          "Turn off email or push reminders whenever you like.",
        ] }] },
        { heading: "Cookies and similar storage", body: ["We use only what the site needs to work: a sign-in session, a guest-cart cookie so your basket survives a visit, and small browser settings such as your last-used pincode. We do not use advertising cookies."] },
        { heading: "Contact us", body: [SITE.supportEmail ? `Questions about your data? Write to ${SITE.supportEmail}.` : "Questions about your data? Use the Contact page and we will respond."] },
      ]}
    />
  );
}

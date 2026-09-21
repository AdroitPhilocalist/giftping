import { LegalPage } from "@/components/pages/LegalPage";
import { getCommerceSettings } from "@/lib/commerce/settings";
import { getReturnWindowDays } from "@/lib/commerce/returns";
import { formatCurrency } from "@/lib/utils/format";

export const metadata = { title: "Refund Policy — GiftPing", description: "Cancellations, returns and refunds at GiftPing." };

export default async function RefundsPage() {
  const [days, settings] = await Promise.all([getReturnWindowDays(), getCommerceSettings()]);
  return (
    <LegalPage
      eyebrow="Peace of mind"
      title="Refund Policy"
      intro="If a gift isn’t right, we want to put it right. Here is exactly how cancellations, returns and refunds work."
      updated="21 September 2026"
      sections={[
        { heading: "Before it ships", body: ["If you change your mind before your order has been dispatched, contact us and we will cancel it. Anything you paid is refunded to the way you paid."] },
        { heading: "Returns after delivery", body: [days > 0 ? `You can ask for a return within ${days} days of delivery, from the order page in your account. Choose the item, the quantity and the reason, and we will review it.` : "Returns are considered case by case; contact us from the order page in your account."]  },
        { heading: "How refunds work", body: [{ list: [
          "Refunds go back to the original payment method, usually within 5–7 working days after we approve them.",
          "We can refund part of an order — for one item, or some of the quantity. You are never refunded more than you paid for that item, after any coupon discount.",
          "Delivery and gift-wrap charges are returned when a whole order is cancelled before it ships. A return after delivery refunds the item itself.",
        ] }] },
        { heading: "Damaged or wrong items", body: ["If something arrives damaged, defective or not as described, request a return within the return window and tell us what went wrong. We review every request and refund the item when it is approved."] },
        { heading: "Delivery charges", body: [`Delivery is ${formatCurrency(settings.deliveryCharge)} per boutique, and free when that boutique’s items come to ${formatCurrency(settings.freeDeliveryThreshold)} or more. Optional gift wrapping is ${formatCurrency(settings.giftWrapCharge)}.`] },
        { heading: "If a payment goes wrong", body: ["If you were charged but your order wasn’t confirmed, or an item sold out while you were paying, the money is returned automatically. If you don’t see it within 7 working days, contact us with your order number."] },
      ]}
    />
  );
}

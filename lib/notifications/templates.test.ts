import { describe, expect, it } from "vitest";
import { safeUrl } from "./email-layout";
import { buildOrderCancelledEmail, buildOrderConfirmedEmail, buildShipmentEmail, buildVendorNewOrderEmail } from "./templates";

const prefs = "https://giftping-lime.vercel.app/account/notifications";
const order = { firstName: "Asha", orderNumber: "GP-100028", items: [{ name: "Premium Gift Hamper", quantity: 1, totalLabel: "₹2,499", detail: "Wrapping: Gold" }], totalLabel: "₹2,499", deliverTo: { name: "Asha Nair", line: "12 Marine Drive, Kochi, Kerala — 682031" }, orderUrl: "https://giftping-lime.vercel.app/orders/abc", preferencesUrl: prefs };

describe("email templates", () => {
  it("order confirmation: subject, contents and a plain-text twin", () => {
    const e = buildOrderConfirmedEmail(order);
    expect(e.subject).toBe("Order GP-100028 confirmed");
    for (const s of ["GP-100028", "Premium Gift Hamper", "₹2,499", "Asha Nair", "View your order"]) expect(e.html).toContain(s);
    expect(e.text).toContain("Total paid: ₹2,499");
    expect(e.text).toContain("https://giftping-lime.vercel.app/orders/abc");
  });
  it("escapes everything user-controlled (names, product names, addresses, gift text)", () => {
    const e = buildOrderConfirmedEmail({ ...order, firstName: "<b>Asha</b>", items: [{ name: `<img src=x onerror=alert(1)>`, quantity: 1, totalLabel: "₹1", detail: `"><script>x</script>` }], deliverTo: { name: "A & B <Sons>", line: "<svg onload=1>" } });
    expect(e.html).not.toMatch(/<img src=x|<script>|<svg onload|<b>Asha/);
    expect(e.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(e.html).toContain("A &amp; B &lt;Sons&gt;");
  });
  it("shipment emails: a distinct subject per stage, tracking shown only when known", () => {
    const base = { firstName: "Asha", orderNumber: "GP-1", vendorName: "Aurelia Gifts", orderUrl: "https://x.test/o", preferencesUrl: prefs };
    expect(buildShipmentEmail({ ...base, kind: "picked_up" }).subject).toBe("Your order GP-1 is on its way");
    expect(buildShipmentEmail({ ...base, kind: "out_for_delivery" }).subject).toMatch(/Out for delivery today/);
    expect(buildShipmentEmail({ ...base, kind: "delivered" }).subject).toBe("Delivered — order GP-1");
    expect(buildShipmentEmail({ ...base, kind: "rto_initiated" }).subject).toMatch(/Delivery problem/);
    const tracked = buildShipmentEmail({ ...base, kind: "picked_up", courier: "Delhivery", awb: "AWB123", trackingUrl: "https://shiprocket.co/tracking/AWB123" });
    expect(tracked.html).toContain("AWB123");
    expect(tracked.html).toContain('href="https://shiprocket.co/tracking/AWB123"');
    expect(buildShipmentEmail({ ...base, kind: "picked_up" }).html).not.toContain("Track on the courier");
  });
  it("never renders a non-http tracking link", () => {
    const e = buildShipmentEmail({ firstName: "A", orderNumber: "GP-1", vendorName: "V", kind: "picked_up", trackingUrl: "javascript:alert(1)", orderUrl: "https://x.test", preferencesUrl: prefs });
    expect(e.html).not.toContain("javascript:");
    expect(safeUrl("javascript:alert(1)")).toBe("#");
    expect(safeUrl("https://ok.test/x")).toBe("https://ok.test/x");
  });
  it("vendor new-order email lists items and says what to do next", () => {
    const e = buildVendorNewOrderEmail({ vendorName: "Aurelia Gifts", orderNumber: "GP-7", items: [{ name: "Vintage Luxe Perfume", quantity: 2 }], earningsLabel: "₹7,738.20", dashboardUrl: "https://x.test/vendor/orders", preferencesUrl: prefs });
    expect(e.subject).toBe("New order GP-7 — ready for you to accept");
    expect(e.html).toContain("Vintage Luxe Perfume × 2");
    expect(e.html).toContain("₹7,738.20");
    expect(e.text).toContain("Accept and ship: https://x.test/vendor/orders");
  });
  it("cancellation email: refund wording vs never-charged, reason escaped", () => {
    const base = { firstName: "Asha", orderNumber: "GP-9", reason: "Item <b>unavailable</b>", supportNote: "Questions? Reply to this email.", orderUrl: "https://x.test/o", preferencesUrl: prefs };
    const refunded = buildOrderCancelledEmail({ ...base, refundLabel: "₹2,499" });
    expect(refunded.subject).toBe("Order GP-9 cancelled — refund on the way");
    expect(refunded.html).toContain("₹2,499");
    expect(refunded.html).toContain("5–7 working days");
    expect(refunded.html).not.toContain("<b>unavailable</b>");
    const unpaid = buildOrderCancelledEmail({ ...base, refundLabel: null, reason: null });
    expect(unpaid.subject).toBe("Order GP-9 cancelled");
    expect(unpaid.html).toContain("You weren't charged");
  });
});

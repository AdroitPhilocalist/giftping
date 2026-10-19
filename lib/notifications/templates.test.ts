import { describe, expect, it } from "vitest";
import { safeUrl } from "./email-layout";
import { buildOrderCancelledEmail, buildDataExportEmail, buildPriceDropEmail, buildOrderConfirmedEmail, buildPayoutPaidEmail, buildReturnUpdateEmail, buildShipmentEmail, buildVendorAccountEmail, buildVendorDecisionEmail, buildVendorNewOrderEmail } from "./templates";

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
  it("payout and vendor-status emails: content, and hostile names/reasons are escaped", () => {
    const paid = buildPayoutPaidEmail({ vendorName: "<i>Aurelia</i>", amountLabel: "₹1,100", reference: "UTR<1>", itemCount: 2, payoutsUrl: "https://x.test/vendor/payouts", preferencesUrl: prefs });
    expect(paid.subject).toBe("Payout of ₹1,100 sent");
    expect(paid.html).toContain("2 delivered items");
    expect(paid.html).not.toContain("<i>Aurelia</i>");
    expect(paid.html).toContain("UTR&lt;1&gt;");
    const sus = buildVendorAccountEmail({ vendorName: "V", kind: "suspended", reason: "Repeated late dispatch <script>", dashboardUrl: "https://x.test", preferencesUrl: prefs });
    expect(sus.subject).toBe("Your GiftPing boutique has been paused");
    expect(sus.html).not.toContain("<script>");
    expect(buildVendorAccountEmail({ vendorName: "V", kind: "reinstated", reason: null, dashboardUrl: "https://x.test", preferencesUrl: prefs }).subject).toBe("Your GiftPing boutique is live again");
  });
  it("vendor decision emails: approved and rejected, with the reviewer's note escaped and a truthful footer", () => {
    const base = { vendorName: "<b>Aurelia</b>", reason: null, dashboardUrl: "https://x.test/vendor/dashboard", registerUrl: "https://x.test/vendor/register", preferencesUrl: prefs };

    const yes = buildVendorDecisionEmail({ ...base, kind: "approved" });
    expect(yes.subject).toBe("Your GiftPing boutique is approved");
    expect(yes.html).not.toContain("<b>Aurelia</b>");
    expect(yes.html).toContain("https://x.test/vendor/dashboard");
    expect(yes.text).toContain("Dashboard: https://x.test/vendor/dashboard");
    // A vendor can be approved before selling anything, so this must not claim to be "because of your order".
    expect(yes.html).toContain("because you applied to sell on GiftPing");
    expect(yes.html).not.toContain("because of your GiftPing order");

    const no = buildVendorDecisionEmail({ ...base, kind: "rejected", reason: "GSTIN <script>alert(1)</script> could not be verified" });
    expect(no.subject).toBe("An update on your GiftPing vendor application");
    expect(no.html).not.toContain("<script>");
    expect(no.html).toContain("&lt;script&gt;");
    expect(no.html).toContain("https://x.test/vendor/register");
    expect(no.text).toContain("Our note:");
    // The rejection email is the only place the reason reaches the applicant outside the site.
    expect(no.text).toContain("could not be verified");
  });
  it("return and refund emails: wording per outcome, notes and names escaped", () => {
    const base = { firstName: "Asha", orderNumber: "GP-7", productName: "<b>Hamper</b>", note: "Pickup on <Monday>", orderUrl: "https://x.test/orders/1", preferencesUrl: prefs };
    const ok = buildReturnUpdateEmail({ ...base, kind: "approved" });
    expect(ok.subject).toBe("Return approved for order GP-7");
    expect(ok.html).not.toContain("<b>Hamper</b>");
    expect(ok.html).toContain("Pickup on &lt;Monday&gt;");
    expect(buildReturnUpdateEmail({ ...base, kind: "rejected", note: "Used item" }).html).toContain("approve this return");
    const refunded = buildReturnUpdateEmail({ ...base, kind: "refunded", amountLabel: "₹450.00", note: null });
    expect(refunded.subject).toBe("Refund of ₹450.00 on its way");
    expect(refunded.html).toContain("5–7 working days");
    expect(refunded.text).toContain("₹450.00 refunded");
    const pickup = buildReturnUpdateEmail({ ...base, kind: "pickup_scheduled", note: null, courier: "<Courier>", awb: "AWB123", trackingUrl: "https://track.test/AWB123" });
    expect(pickup.subject).toBe("Your return pickup is scheduled — order GP-7");
    expect(pickup.html).toContain("Tracking number AWB123");
    expect(pickup.html).not.toContain("<Courier>");
    expect(pickup.html).toContain("https://track.test/AWB123");
    expect(pickup.text).toContain("AWB123");
  });
  it("data-export notice: says when, escapes the name, tells them what to do if it wasn't them", () => {
    const e = buildDataExportEmail({ firstName: "<b>Asha</b>", whenLabel: "21 Sept 2026, 9:30 pm IST", accountUrl: "https://x.test/account", preferencesUrl: prefs });
    expect(e.subject).toBe("A copy of your GiftPing data was downloaded");
    expect(e.html).toContain("21 Sept 2026, 9:30 pm IST");
    expect(e.html).not.toContain("<b>Asha</b>");
    expect(e.html).toContain("change your password");
    expect(e.text).toContain("If it wasn't");
  });
  it("price-drop email: singular vs digest wording, struck-through old price, link and opt-out", () => {
    const one = buildPriceDropEmail({ firstName: "Asha", items: [{ name: "Luxe Memory Hamper", url: "https://x.test/products/luxe", fromLabel: "₹2,999", toLabel: "₹2,399", percentOff: 20 }], more: 0, wishlistUrl: "https://x.test/wishlist", preferencesUrl: prefs });
    expect(one.subject).toBe("Price drop: Luxe Memory Hamper is now ₹2,399");
    for (const s of ["20% off", "line-through", 'href="https://x.test/products/luxe"', "Turn wishlist alerts off", "See my wishlist"]) expect(one.html).toContain(s);
    expect(one.text).toContain("₹2,999 -> ₹2,399");
    const many = buildPriceDropEmail({ firstName: "Asha", items: [{ name: "A", url: "https://x.test/a", fromLabel: "₹10", toLabel: "₹8", percentOff: 20 }, { name: "B", url: "https://x.test/b", fromLabel: "₹10", toLabel: "₹9", percentOff: 10 }], more: 3, wishlistUrl: "https://x.test/wishlist", preferencesUrl: prefs });
    expect(many.subject).toBe("Price drops on 5 items in your wishlist");
    expect(many.html).toContain("and 3 more");
  });
  it("price-drop email escapes vendor-controlled product names and refuses a javascript: link", () => {
    const e = buildPriceDropEmail({ firstName: "<b>A</b>", items: [{ name: `<img src=x onerror=alert(1)>`, url: "javascript:alert(1)", fromLabel: "₹1", toLabel: "₹0", percentOff: 99 }], more: 0, wishlistUrl: "https://x.test/w", preferencesUrl: prefs });
    expect(e.html).not.toMatch(/<img src=x|<b>A<|javascript:/);
    expect(e.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
  it("vendor new-order email puts the text to engrave on its own prominent line, escaped", () => {
    const e = buildVendorNewOrderEmail({ vendorName: "Lumière", orderNumber: "GP-1", items: [{ name: "Keepsake Box", quantity: 1, engraving: "Meera & <b>Rohan</b>" }, { name: "Candle", quantity: 2 }], earningsLabel: null, dashboardUrl: "https://x.test/vendor/orders", preferencesUrl: prefs });
    expect(e.html).toContain("Engrave: “Meera &amp; &lt;b&gt;Rohan&lt;/b&gt;”");
    expect(e.html).not.toContain("<b>Rohan</b>");
    expect(e.text).toContain("ENGRAVE: “Meera & <b>Rohan</b>”");
    expect(e.html.match(/Engrave:/g)).toHaveLength(1); // only the line that has engraving
    expect(e.text).toContain("- Candle × 2");
  });
});

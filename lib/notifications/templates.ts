import { escapeHtml, renderEmailFrame, type BuiltEmail } from "./email-layout";

const row = (left: string, right: string) =>
  `<tr><td style="padding:8px 0;border-top:1px solid #eee">${left}</td><td align="right" style="padding:8px 0;border-top:1px solid #eee;white-space:nowrap">${right}</td></tr>`;

const footer = (preferencesUrl: string) =>
  `You're getting this because of your GiftPing order. <a href="${escapeHtml(preferencesUrl)}" style="color:#888">Notification settings</a>.`;

// ---------------------------------------------------------------------------
// Order confirmed (customer)
// ---------------------------------------------------------------------------
export interface OrderConfirmedInput {
  firstName: string;
  orderNumber: string;
  items: { name: string; quantity: number; totalLabel: string; detail?: string | null }[];
  totalLabel: string;
  deliverTo: { name: string; line: string };
  orderUrl: string;
  preferencesUrl: string;
}

export function buildOrderConfirmedEmail(i: OrderConfirmedInput): BuiltEmail {
  const rows = i.items
    .map((it) => row(`${escapeHtml(it.name)} × ${it.quantity}${it.detail ? `<br/><span style="color:#777;font-size:12px">${escapeHtml(it.detail)}</span>` : ""}`, escapeHtml(it.totalLabel)))
    .join("");
  const html = renderEmailFrame({
    preheader: `Order ${i.orderNumber} is confirmed`,
    heading: `Thank you, ${i.firstName} — your order is confirmed`,
    bodyHtml: `<p style="margin:0 0 16px;color:#555">Order <strong>${escapeHtml(i.orderNumber)}</strong> is paid and our boutiques are getting it ready. We'll email you again as each part ships.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${row("<strong>Total paid</strong>", `<strong>${escapeHtml(i.totalLabel)}</strong>`)}</table>
<p style="margin:16px 0 0;color:#555"><strong>Delivering to</strong><br/>${escapeHtml(i.deliverTo.name)}<br/>${escapeHtml(i.deliverTo.line)}</p>`,
    cta: { label: "View your order", url: i.orderUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [
    `Thank you, ${i.firstName} — your order ${i.orderNumber} is confirmed.`,
    "",
    ...i.items.map((it) => `- ${it.name} × ${it.quantity}  ${it.totalLabel}`),
    `Total paid: ${i.totalLabel}`,
    "",
    `Delivering to: ${i.deliverTo.name}, ${i.deliverTo.line}`,
    `View your order: ${i.orderUrl}`,
    `Notification settings: ${i.preferencesUrl}`,
  ].join("\n");
  return { subject: `Order ${i.orderNumber} confirmed`, html, text };
}

// ---------------------------------------------------------------------------
// Shipment updates (customer)
// ---------------------------------------------------------------------------
export type ShipmentEmailKind = "booked" | "picked_up" | "out_for_delivery" | "delivered" | "rto_initiated";

const SHIPMENT_COPY: Record<ShipmentEmailKind, { subject: (v: string, o: string) => string; heading: string; body: (v: string) => string }> = {
  booked: { subject: (v) => `${v} has packed your gift`, heading: "Your gift is packed", body: (v) => `${v} has packed your items and booked a courier.` },
  picked_up: { subject: (_v, o) => `Your order ${o} is on its way`, heading: "On its way", body: (v) => `${v} has handed your items to the courier.` },
  out_for_delivery: { subject: (_v, o) => `Out for delivery today — order ${o}`, heading: "Out for delivery today", body: (v) => `Your items from ${v} are out for delivery. Someone should be available to receive them.` },
  delivered: { subject: (_v, o) => `Delivered — order ${o}`, heading: "Delivered", body: (v) => `Your items from ${v} were delivered. We hope they bring a smile!` },
  rto_initiated: { subject: (_v, o) => `Delivery problem — order ${o}`, heading: "We couldn't deliver this one", body: (v) => `The courier couldn't deliver your items from ${v}, so they're returning to the seller. We'll be in touch about next steps.` },
};

export interface ShipmentEmailInput {
  kind: ShipmentEmailKind;
  firstName: string;
  orderNumber: string;
  vendorName: string;
  courier?: string | null;
  awb?: string | null;
  trackingUrl?: string | null;
  orderUrl: string;
  preferencesUrl: string;
}

export function buildShipmentEmail(i: ShipmentEmailInput): BuiltEmail {
  const copy = SHIPMENT_COPY[i.kind];
  const trackLine = i.awb ? `${i.courier ? `${i.courier} · ` : ""}Tracking number ${i.awb}` : "";
  const html = renderEmailFrame({
    preheader: copy.body(i.vendorName),
    heading: copy.heading,
    bodyHtml: `<p style="margin:0 0 8px;color:#555">Hi ${escapeHtml(i.firstName)},</p><p style="margin:0 0 12px;color:#555">${escapeHtml(copy.body(i.vendorName))}</p>
<p style="margin:0;color:#777;font-size:13px">Order ${escapeHtml(i.orderNumber)}${trackLine ? `<br/>${escapeHtml(trackLine)}` : ""}</p>
${i.trackingUrl ? `<p style="margin:12px 0 0"><a href="${escapeHtml(i.trackingUrl.startsWith("http") ? i.trackingUrl : "#")}" style="color:#1A4731">Track on the courier's site</a></p>` : ""}`,
    cta: { label: "See order details", url: i.orderUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.firstName},`, "", copy.body(i.vendorName), `Order ${i.orderNumber}`, ...(trackLine ? [trackLine] : []), ...(i.trackingUrl ? [`Track: ${i.trackingUrl}`] : []), "", `Order details: ${i.orderUrl}`, `Notification settings: ${i.preferencesUrl}`].join("\n");
  return { subject: copy.subject(i.vendorName, i.orderNumber), html, text };
}

// ---------------------------------------------------------------------------
// New order (vendor)
// ---------------------------------------------------------------------------
export interface VendorNewOrderInput {
  vendorName: string;
  orderNumber: string;
  items: { name: string; quantity: number }[];
  earningsLabel: string | null;
  dashboardUrl: string;
  preferencesUrl: string;
}

export function buildVendorNewOrderEmail(i: VendorNewOrderInput): BuiltEmail {
  const list = i.items.map((it) => `<li>${escapeHtml(it.name)} × ${it.quantity}</li>`).join("");
  const html = renderEmailFrame({
    preheader: `New paid order ${i.orderNumber}`,
    heading: "You have a new order",
    bodyHtml: `<p style="margin:0 0 12px;color:#555">Hi ${escapeHtml(i.vendorName)} — order <strong>${escapeHtml(i.orderNumber)}</strong> has been paid and is waiting for you to accept it.</p>
<ul style="margin:0 0 12px;padding-left:20px;color:#333">${list}</ul>
${i.earningsLabel ? `<p style="margin:0;color:#555">Your earnings: <strong>${escapeHtml(i.earningsLabel)}</strong></p>` : ""}`,
    cta: { label: "Accept and ship", url: i.dashboardUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.vendorName},`, "", `Order ${i.orderNumber} has been paid and is waiting for you.`, ...i.items.map((it) => `- ${it.name} × ${it.quantity}`), ...(i.earningsLabel ? [`Your earnings: ${i.earningsLabel}`] : []), "", `Accept and ship: ${i.dashboardUrl}`].join("\n");
  return { subject: `New order ${i.orderNumber} — ready for you to accept`, html, text };
}

// ---------------------------------------------------------------------------
// Order cancelled (customer)
// ---------------------------------------------------------------------------
export interface OrderCancelledInput {
  firstName: string;
  orderNumber: string;
  /** null when nothing had been charged */
  refundLabel: string | null;
  reason: string | null;
  supportNote: string;
  orderUrl: string;
  preferencesUrl: string;
}

export function buildOrderCancelledEmail(i: OrderCancelledInput): BuiltEmail {
  const html = renderEmailFrame({
    preheader: `Order ${i.orderNumber} was cancelled`,
    heading: "Your order was cancelled",
    bodyHtml: `<p style="margin:0 0 8px;color:#555">Hi ${escapeHtml(i.firstName)},</p>
<p style="margin:0 0 12px;color:#555">Order <strong>${escapeHtml(i.orderNumber)}</strong> has been cancelled${i.reason ? `: ${escapeHtml(i.reason)}` : "."}</p>
${i.refundLabel ? `<p style="margin:0 0 12px;color:#555"><strong>${escapeHtml(i.refundLabel)}</strong> is being refunded to your original payment method. It usually appears within 5–7 working days.</p>` : `<p style="margin:0 0 12px;color:#555">You weren't charged for this order.</p>`}
<p style="margin:0;color:#777;font-size:13px">${escapeHtml(i.supportNote)}</p>`,
    cta: { label: "View the order", url: i.orderUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.firstName},`, "", `Order ${i.orderNumber} has been cancelled${i.reason ? `: ${i.reason}` : "."}`, i.refundLabel ? `${i.refundLabel} is being refunded to your original payment method (usually 5–7 working days).` : "You weren't charged for this order.", "", i.supportNote, `Order: ${i.orderUrl}`].join("\n");
  return { subject: `Order ${i.orderNumber} cancelled${i.refundLabel ? " — refund on the way" : ""}`, html, text };
}

// ---------------------------------------------------------------------------
// Account deleted (customer) — sent to the address on file just before it is scrubbed
// ---------------------------------------------------------------------------
export interface AccountDeletedInput {
  firstName: string;
  byAdmin: boolean;
  appUrl: string;
}

export function buildAccountDeletedEmail(i: AccountDeletedInput): BuiltEmail {
  const html = renderEmailFrame({
    preheader: "Your GiftPing account has been deleted",
    heading: "Your account has been deleted",
    bodyHtml: `<p style="margin:0 0 8px;color:#555">Hi ${escapeHtml(i.firstName)},</p>
<p style="margin:0 0 12px;color:#555">${i.byAdmin ? "As you asked, we've" : "We've"} deleted your GiftPing account. Your diary, saved addresses, wishlist, reviews and notifications have been removed, and your personal details have been erased.</p>
<p style="margin:0;color:#777;font-size:13px">We keep a minimal record of past orders (amounts and dates, without your name or address), because tax and accounting law requires it. If this wasn't you, reply to this email straight away.</p>`,
    cta: { label: "Visit GiftPing", url: i.appUrl },
    footerHtml: "This is the last email you'll receive from us.",
  });
  const text = [`Hi ${i.firstName},`, "", `${i.byAdmin ? "As you asked, we've" : "We've"} deleted your GiftPing account. Your diary, addresses, wishlist, reviews and notifications are removed and your personal details erased.`, "We keep a minimal record of past orders (without your name or address) as tax and accounting law requires.", "If this wasn't you, reply to this email straight away."].join("\n");
  return { subject: "Your GiftPing account has been deleted", html, text };
}

// ---------------------------------------------------------------------------
// Vendor: payout sent / account status changed
// ---------------------------------------------------------------------------
export interface PayoutPaidInput { vendorName: string; amountLabel: string; reference: string; itemCount: number; payoutsUrl: string; preferencesUrl: string }

export function buildPayoutPaidEmail(i: PayoutPaidInput): BuiltEmail {
  const html = renderEmailFrame({
    preheader: `${i.amountLabel} has been paid to your bank account`,
    heading: "Your payout has been sent",
    bodyHtml: `<p style="margin:0 0 12px;color:#555">Hi ${escapeHtml(i.vendorName)}, we've paid <strong>${escapeHtml(i.amountLabel)}</strong> to your registered bank account for ${i.itemCount} delivered ${i.itemCount === 1 ? "item" : "items"}.</p>
<p style="margin:0;color:#777;font-size:13px">Bank reference: <strong>${escapeHtml(i.reference)}</strong>. It can take a working day to show in your account. A line-by-line statement is in your dashboard.</p>`,
    cta: { label: "See your payouts", url: i.payoutsUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.vendorName},`, "", `We've paid ${i.amountLabel} to your registered bank account for ${i.itemCount} delivered item(s).`, `Bank reference: ${i.reference}`, "", `Statement: ${i.payoutsUrl}`].join("\n");
  return { subject: `Payout of ${i.amountLabel} sent`, html, text };
}

export interface VendorAccountInput { vendorName: string; kind: "suspended" | "reinstated"; reason: string | null; dashboardUrl: string; preferencesUrl: string }

export function buildVendorAccountEmail(i: VendorAccountInput): BuiltEmail {
  const suspended = i.kind === "suspended";
  const html = renderEmailFrame({
    preheader: suspended ? "Your GiftPing boutique has been paused" : "Your GiftPing boutique is live again",
    heading: suspended ? "Your boutique has been paused" : "Your boutique is live again",
    bodyHtml: suspended
      ? `<p style="margin:0 0 12px;color:#555">Hi ${escapeHtml(i.vendorName)}, your boutique has been paused and your products are hidden from shoppers.${i.reason ? ` Reason: ${escapeHtml(i.reason)}.` : ""}</p><p style="margin:0;color:#777;font-size:13px">Orders that were already paid will be looked after by the GiftPing team. Reply to this email if you'd like to talk it through.</p>`
      : `<p style="margin:0;color:#555">Hi ${escapeHtml(i.vendorName)}, good news — your boutique has been reinstated and your products are visible to shoppers again.</p>`,
    cta: { label: "Open your dashboard", url: i.dashboardUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.vendorName},`, "", suspended ? `Your boutique has been paused and your products are hidden.${i.reason ? ` Reason: ${i.reason}.` : ""}` : "Your boutique has been reinstated and is visible to shoppers again.", `Dashboard: ${i.dashboardUrl}`].join("\n");
  return { subject: suspended ? "Your GiftPing boutique has been paused" : "Your GiftPing boutique is live again", html, text };
}

// ---------------------------------------------------------------------------
// Returns and refunds (customer)
// ---------------------------------------------------------------------------
export interface ReturnUpdateInput {
  kind: "approved" | "rejected" | "refunded";
  firstName: string;
  orderNumber: string;
  productName: string;
  /** "₹450.00" — only for kind "refunded" */
  amountLabel?: string;
  /** the admin's note (approval instructions / the reason for rejecting) */
  note: string | null;
  orderUrl: string;
  preferencesUrl: string;
}

export function buildReturnUpdateEmail(i: ReturnUpdateInput): BuiltEmail {
  const product = escapeHtml(i.productName);
  const copy = {
    approved: {
      subject: `Return approved for order ${i.orderNumber}`,
      heading: "Your return was approved",
      body: `<p style="margin:0 0 12px;color:#555">We've approved your return of <strong>${product}</strong> from order <strong>${escapeHtml(i.orderNumber)}</strong>. Our team will be in touch to arrange the pickup; your refund follows once we have confirmed it.</p>`,
    },
    rejected: {
      subject: `Update on your return for order ${i.orderNumber}`,
      heading: "We couldn't approve this return",
      body: `<p style="margin:0 0 12px;color:#555">We're sorry — we weren't able to approve the return of <strong>${product}</strong> from order <strong>${escapeHtml(i.orderNumber)}</strong>.</p>`,
    },
    refunded: {
      subject: `Refund of ${i.amountLabel ?? "your payment"} on its way`,
      heading: "Your refund is on its way",
      body: `<p style="margin:0 0 12px;color:#555"><strong>${escapeHtml(i.amountLabel ?? "")}</strong> for <strong>${product}</strong> (order <strong>${escapeHtml(i.orderNumber)}</strong>) is being refunded to your original payment method. It usually appears within 5–7 working days.</p>`,
    },
  }[i.kind];
  const html = renderEmailFrame({
    preheader: copy.heading,
    heading: copy.heading,
    bodyHtml: `<p style="margin:0 0 8px;color:#555">Hi ${escapeHtml(i.firstName)},</p>${copy.body}${i.note ? `<p style="margin:0 0 12px;color:#555">Note from our team: ${escapeHtml(i.note)}</p>` : ""}<p style="margin:0;color:#777;font-size:13px">Questions? Just reply to this email.</p>`,
    cta: { label: "View the order", url: i.orderUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.firstName},`, "", copy.heading + " — " + i.productName + " (order " + i.orderNumber + ")" + (i.amountLabel && i.kind === "refunded" ? `: ${i.amountLabel} refunded to your original payment method (usually 5–7 working days).` : "."), i.note ? `Note from our team: ${i.note}` : "", `Order: ${i.orderUrl}`].filter(Boolean).join("\n");
  return { subject: copy.subject, html, text };
}

// ---------------------------------------------------------------------------
// A copy of the account's data was downloaded (security notice)
// ---------------------------------------------------------------------------
export interface DataExportInput { firstName: string; whenLabel: string; accountUrl: string; preferencesUrl: string }

export function buildDataExportEmail(i: DataExportInput): BuiltEmail {
  const html = renderEmailFrame({
    preheader: "A copy of your GiftPing data was downloaded",
    heading: "A copy of your data was downloaded",
    bodyHtml: `<p style="margin:0 0 8px;color:#555">Hi ${escapeHtml(i.firstName)},</p>
<p style="margin:0 0 12px;color:#555">On <strong>${escapeHtml(i.whenLabel)}</strong>, someone signed in to your account downloaded a copy of the personal data GiftPing holds about you.</p>
<p style="margin:0;color:#777;font-size:13px">If that was you, there's nothing to do. If it wasn't, change your password now and get in touch — reply to this email and we'll help.</p>`,
    cta: { label: "Go to my account", url: i.accountUrl },
    footerHtml: footer(i.preferencesUrl),
  });
  const text = [`Hi ${i.firstName},`, "", `On ${i.whenLabel}, someone signed in to your account downloaded a copy of the personal data GiftPing holds about you.`, "If that was you, there's nothing to do. If it wasn't, change your password now and reply to this email.", `Account: ${i.accountUrl}`].join("\n");
  return { subject: "A copy of your GiftPing data was downloaded", html, text };
}

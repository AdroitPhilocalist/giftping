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

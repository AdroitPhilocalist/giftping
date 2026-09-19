import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signWebhookBody, verifyCheckoutSignature, verifyWebhookSignature } from "./razorpay-signature";

const hex = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest("hex");

describe("verifyCheckoutSignature", () => {
  const base = { razorpayOrderId: "order_ABC", razorpayPaymentId: "pay_XYZ", keySecret: "s3cret" };
  it("accepts the documented order_id|payment_id HMAC", () => {
    expect(verifyCheckoutSignature({ ...base, signature: hex("s3cret", "order_ABC|pay_XYZ") })).toBe(true);
  });
  it("rejects a signature for a different payment / order / secret", () => {
    expect(verifyCheckoutSignature({ ...base, signature: hex("s3cret", "order_ABC|pay_OTHER") })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: hex("s3cret", "order_OTHER|pay_XYZ") })).toBe(false);
    expect(verifyCheckoutSignature({ ...base, signature: hex("wrong", "order_ABC|pay_XYZ") })).toBe(false);
  });
  it("rejects missing, malformed and wrong-length signatures without throwing", () => {
    for (const bad of [null, undefined, "", "zz", "abc", "00", hex("s3cret", "order_ABC|pay_XYZ") + "00"]) {
      expect(verifyCheckoutSignature({ ...base, signature: bad })).toBe(false);
    }
  });
  it("never validates with an empty secret", () => {
    expect(verifyCheckoutSignature({ ...base, keySecret: "", signature: hex("", "order_ABC|pay_XYZ") })).toBe(false);
  });
});

describe("verifyWebhookSignature", () => {
  const body = '{"event":"payment.captured","payload":{"x":1}}';
  it("accepts an HMAC of the exact raw body", () => {
    expect(verifyWebhookSignature({ rawBody: body, signature: signWebhookBody(body, "whsec"), webhookSecret: "whsec" })).toBe(true);
  });
  it("rejects a body altered by even one byte (e.g. re-serialised JSON)", () => {
    const sig = signWebhookBody(body, "whsec");
    expect(verifyWebhookSignature({ rawBody: body + " ", signature: sig, webhookSecret: "whsec" })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: JSON.stringify(JSON.parse(body), null, 1), signature: sig, webhookSecret: "whsec" })).toBe(false);
  });
  it("rejects a wrong secret and an unset secret", () => {
    const sig = signWebhookBody(body, "whsec");
    expect(verifyWebhookSignature({ rawBody: body, signature: sig, webhookSecret: "nope" })).toBe(false);
    expect(verifyWebhookSignature({ rawBody: body, signature: signWebhookBody(body, ""), webhookSecret: "" })).toBe(false);
  });
});

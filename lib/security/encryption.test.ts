import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.VENDOR_BANK_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a value", async () => {
    const { encryptSecret, decryptSecret } = await import("./encryption");
    expect(decryptSecret(encryptSecret("123456789012"))).toBe("123456789012");
  });

  it("never stores the plaintext and uses a fresh IV each call", async () => {
    const { encryptSecret } = await import("./encryption");
    const a = encryptSecret("123456789012");
    const b = encryptSecret("123456789012");
    expect(a).not.toContain("123456789012");
    expect(a).not.toBe(b);
  });

  it("rejects a tampered ciphertext (GCM authentication)", async () => {
    const { encryptSecret, decryptSecret } = await import("./encryption");
    const buf = Buffer.from(encryptSecret("123456789012"), "base64");
    buf[buf.length - 1] ^= 0xff;
    expect(() => decryptSecret(buf.toString("base64"))).toThrow();
  });

  it("refuses to run with a wrong-length key", async () => {
    const { encryptSecret } = await import("./encryption");
    const original = process.env.VENDOR_BANK_ENCRYPTION_KEY;
    process.env.VENDOR_BANK_ENCRYPTION_KEY = Buffer.alloc(16).toString("base64");
    expect(() => encryptSecret("x")).toThrow(/32 bytes/);
    process.env.VENDOR_BANK_ENCRYPTION_KEY = original;
  });
});

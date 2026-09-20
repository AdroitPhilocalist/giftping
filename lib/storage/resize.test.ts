import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";

// resize.ts is server-only; in tests it is just a normal module.
vi.mock("server-only", () => ({}));
const { ImageValidationError, processBannerImage, processVendorBanner, processVendorLogo } = await import("./resize");

const png = (width: number, height: number) => sharp({ create: { width, height, channels: 3, background: { r: 30, g: 90, b: 60 } } }).png().toBuffer();
const meta = (buf: Buffer) => sharp(buf).metadata();

describe("processVendorLogo", () => {
  it("centre-crops any accepted shape to a 512×512 WebP", async () => {
    for (const [w, h] of [[900, 700], [600, 600], [300, 500], [1000, 500]] as const) {
      const { logo } = await processVendorLogo(await png(w, h));
      const m = await meta(logo);
      expect([m.format, m.width, m.height], `${w}x${h}`).toEqual(["webp", 512, 512]);
    }
  });
  it("refuses tiny and badly stretched images", async () => {
    await expect(processVendorLogo(await png(150, 150))).rejects.toThrow(/at least 200px/);
    await expect(processVendorLogo(await png(1200, 300))).rejects.toThrow(/roughly square/);
    await expect(processVendorLogo(await png(300, 1200))).rejects.toThrow(/roughly square/);
  });
  it("refuses files that aren't images, whatever they're called", async () => {
    await expect(processVendorLogo(Buffer.from("<svg onload=alert(1)></svg>"))).rejects.toBeInstanceOf(ImageValidationError);
    await expect(processVendorLogo(Buffer.from("not an image at all"))).rejects.toBeInstanceOf(ImageValidationError);
  });
  it("refuses files over 4MB before doing any work", async () => {
    await expect(processVendorLogo(Buffer.alloc(4 * 1024 * 1024 + 1))).rejects.toThrow(/larger than 4MB/);
  });
  it("drops metadata (EXIF/GPS) from what it stores", async () => {
    const tagged = await sharp({ create: { width: 600, height: 600, channels: 3, background: "#123456" } }).jpeg().withExif({ IFD0: { Copyright: "private" } }).toBuffer();
    const { logo } = await processVendorLogo(tagged);
    expect((await meta(logo)).exif).toBeUndefined();
  });
});

describe("processVendorBanner", () => {
  it("stores 1600px and 800px wide WebP renditions of a wide image", async () => {
    const { full, medium } = await processVendorBanner(await png(2400, 750));
    expect(await meta(full)).toMatchObject({ format: "webp", width: 1600 });
    expect(await meta(medium)).toMatchObject({ format: "webp", width: 800 });
  });
  it("never enlarges a smaller image", async () => {
    const { full } = await processVendorBanner(await png(1200, 375));
    expect((await meta(full)).width).toBe(1200);
  });
  it("refuses narrow, tall and strip-thin images", async () => {
    await expect(processVendorBanner(await png(800, 250))).rejects.toThrow(/at least 1000px wide/);
    await expect(processVendorBanner(await png(1200, 800))).rejects.toThrow(/wide and short/);
    await expect(processVendorBanner(await png(2000, 300))).rejects.toThrow(/wide and short/);
  });
  it("judges the shape as viewers see it (EXIF orientation), not the stored pixels", async () => {
    // stored 800x2000 but flagged "rotate 90°" => viewers see 2000x800 (2.5:1): acceptable
    const rotated = await sharp({ create: { width: 800, height: 2000, channels: 3, background: "#224466" } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const { full } = await processVendorBanner(rotated);
    const m = await meta(full);
    expect(m.width).toBeGreaterThan(m.height!);
  });
});

describe("processBannerImage (homepage hero)", () => {
  it("accepts 16:7 and refuses tall or narrow images", async () => {
    const { full } = await processBannerImage(await png(1920, 840));
    expect((await meta(full)).width).toBe(1920);
    await expect(processBannerImage(await png(1000, 500))).rejects.toThrow(/at least 1200px wide/);
    await expect(processBannerImage(await png(1300, 1900))).rejects.toThrow(/should be wide/);
  });
});

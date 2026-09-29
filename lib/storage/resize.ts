import "server-only";
import sharp, { type Metadata } from "sharp";

export const IMAGE_SIZES = { full: 1600, medium: 800, thumb: 400 } as const;
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // Vercel's request body cap is 4.5MB
const MIN_DIMENSION = 400;
const ALLOWED_INPUT_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageValidationError extends Error {}

export interface ProcessedImage {
  full: Buffer;
  medium: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}

/**
 * Decodes the upload with sharp (so the *real* bytes are validated, not the client-declared MIME
 * type or filename), auto-rotates from EXIF, and re-encodes to WebP at three fixed sizes. Re-encoding
 * also drops all metadata (EXIF/GPS) and neutralises anything odd embedded in the original file.
 */
export async function processProductImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError("Image is larger than 4MB.");
  }

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageValidationError("That file isn't a valid image.");
  }

  if (!metadata.format || !ALLOWED_INPUT_FORMATS.has(metadata.format)) {
    throw new ImageValidationError("Only JPEG, PNG, or WebP images are supported.");
  }
  if (!metadata.width || !metadata.height || Math.min(metadata.width, metadata.height) < MIN_DIMENSION) {
    throw new ImageValidationError(`Images must be at least ${MIN_DIMENSION}px on their shortest side.`);
  }

  const base = () => sharp(input, { limitInputPixels: 50_000_000 }).rotate();
  const render = (width: number, quality: number) =>
    base()
      .resize({ width, height: width, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer({ resolveWithObject: true });

  const [full, medium, thumb] = await Promise.all([
    render(IMAGE_SIZES.full, 84),
    render(IMAGE_SIZES.medium, 82),
    render(IMAGE_SIZES.thumb, 78),
  ]);

  return {
    full: full.data,
    medium: medium.data,
    thumb: thumb.data,
    width: full.info.width,
    height: full.info.height,
  };
}

export const BANNER_SIZES = { full: 2000, medium: 1000 } as const;
const BANNER_MIN_WIDTH = 1200;
// A hero is wide: refuse shapes that would crop to nonsense (a tall poster, or a thin strip).
const BANNER_MIN_RATIO = 1.3;
const BANNER_MAX_RATIO = 3.2;

export interface ProcessedBanner {
  full: Buffer;
  medium: Buffer;
  width: number;
  height: number;
}

/** Same real-bytes validation as product photos, plus width/shape rules for a hero image. Outputs WebP at 2000px and 1000px wide (metadata stripped). */
export async function processBannerImage(input: Buffer): Promise<ProcessedBanner> {
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageValidationError("Image is larger than 4MB.");

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageValidationError("That file isn't a valid image.");
  }
  if (!metadata.format || !ALLOWED_INPUT_FORMATS.has(metadata.format)) throw new ImageValidationError("Only JPEG, PNG, or WebP images are supported.");
  // EXIF orientation 5-8 means the stored width/height are swapped relative to what viewers see
  const rotated = (metadata.orientation ?? 1) >= 5;
  const width = (rotated ? metadata.height : metadata.width) ?? 0;
  const height = (rotated ? metadata.width : metadata.height) ?? 0;
  if (width < BANNER_MIN_WIDTH) throw new ImageValidationError(`Banner images must be at least ${BANNER_MIN_WIDTH}px wide (1920×840 is ideal).`);
  const ratio = width / height;
  if (ratio < BANNER_MIN_RATIO || ratio > BANNER_MAX_RATIO) throw new ImageValidationError("Banner images should be wide — about 16:7 (for example 1920×840).");

  const render = (target: number, quality: number) =>
    sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality }).toBuffer({ resolveWithObject: true });
  const [full, medium] = await Promise.all([render(BANNER_SIZES.full, 82), render(BANNER_SIZES.medium, 78)]);
  return { full: full.data, medium: medium.data, width: full.info.width, height: full.info.height };
}

/** Shared validation for the branding images below: real bytes via sharp, allowed formats, size, and the dimensions AS VIEWERS SEE THEM (EXIF-rotated). */
async function inspectUpload(input: Buffer): Promise<{ width: number; height: number }> {
  if (input.length > MAX_UPLOAD_BYTES) throw new ImageValidationError("Image is larger than 4MB.");
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new ImageValidationError("That file isn't a valid image.");
  }
  if (!metadata.format || !ALLOWED_INPUT_FORMATS.has(metadata.format)) throw new ImageValidationError("Only JPEG, PNG, or WebP images are supported.");
  const rotated = (metadata.orientation ?? 1) >= 5;
  return { width: (rotated ? metadata.height : metadata.width) ?? 0, height: (rotated ? metadata.width : metadata.height) ?? 0 };
}

export const LOGO_SIZE = 512;
const LOGO_MIN_EDGE = 200;

/** A boutique logo: centre-cropped to a square and stored at 512×512 WebP. Very stretched images are refused rather than cropped to nonsense. */
export async function processVendorLogo(input: Buffer): Promise<{ logo: Buffer }> {
  const { width, height } = await inspectUpload(input);
  if (Math.min(width, height) < LOGO_MIN_EDGE) throw new ImageValidationError(`Logos must be at least ${LOGO_MIN_EDGE}px on their shortest side (512×512 is ideal).`);
  const ratio = width / height;
  if (ratio < 0.5 || ratio > 2) throw new ImageValidationError("Logos should be roughly square — this one would be cropped too much.");
  const logo = await sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: LOGO_SIZE, height: LOGO_SIZE, fit: "cover", position: "centre" })
    .webp({ quality: 86 })
    .toBuffer();
  return { logo };
}

export const VENDOR_BANNER_SIZES = { full: 1600, medium: 800 } as const;
const VENDOR_BANNER_MIN_WIDTH = 1000;

/** A boutique banner for the top of its storefront: wide (about 16:5), stored at 1600px and 800px wide. */
export async function processVendorBanner(input: Buffer): Promise<{ full: Buffer; medium: Buffer }> {
  const { width, height } = await inspectUpload(input);
  if (width < VENDOR_BANNER_MIN_WIDTH) throw new ImageValidationError(`Banners must be at least ${VENDOR_BANNER_MIN_WIDTH}px wide (1600×500 is ideal).`);
  const ratio = width / height;
  if (ratio < 2 || ratio > 4.5) throw new ImageValidationError("Banners should be wide and short — about 16:5 (for example 1600×500).");
  const render = (target: number, quality: number) =>
    sharp(input, { limitInputPixels: 50_000_000 }).rotate().resize({ width: target, withoutEnlargement: true }).webp({ quality }).toBuffer();
  const [full, medium] = await Promise.all([render(VENDOR_BANNER_SIZES.full, 82), render(VENDOR_BANNER_SIZES.medium, 78)]);
  return { full, medium };
}

export const DIARY_PHOTO_SIZE = 720;
const DIARY_PHOTO_MIN_EDGE = 200;

/**
 * A photo of someone in the diary: centre-cropped (toward what looks most interesting — usually a face) to a square and stored at 720×720 WebP.
 * Same real-bytes validation as every other upload; re-encoding strips EXIF/GPS, which matters more here than anywhere — this is a photo of a
 * family member that must not carry the location it was taken at.
 */
export async function processDiaryPhoto(input: Buffer): Promise<Buffer> {
  const { width, height } = await inspectUpload(input);
  if (Math.min(width, height) < DIARY_PHOTO_MIN_EDGE) throw new ImageValidationError(`Photos must be at least ${DIARY_PHOTO_MIN_EDGE}px on their shortest side.`);
  return sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: DIARY_PHOTO_SIZE, height: DIARY_PHOTO_SIZE, fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 84 })
    .toBuffer();
}

export const AVATAR_SIZE = 400;
const AVATAR_MIN_EDGE = 160;

/** A customer's profile photo: centre-cropped toward whatever looks most interesting (usually a face, same strategy as a diary photo) to a square, stored at 400×400 WebP. */
export async function processUserAvatar(input: Buffer): Promise<Buffer> {
  const { width, height } = await inspectUpload(input);
  if (Math.min(width, height) < AVATAR_MIN_EDGE) throw new ImageValidationError(`Photos must be at least ${AVATAR_MIN_EDGE}px on their shortest side.`);
  return sharp(input, { limitInputPixels: 50_000_000 })
    .rotate()
    .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE, fit: "cover", position: sharp.strategy.attention })
    .webp({ quality: 84 })
    .toBuffer();
}

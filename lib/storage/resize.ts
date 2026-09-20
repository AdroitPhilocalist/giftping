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

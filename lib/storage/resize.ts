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
